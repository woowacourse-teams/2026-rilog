import express from 'express';
import { randomUUID } from 'node:crypto';
import { ApiError, validateUrl, downloadImage } from './download.mjs';
import { compactImage, normalizeImage } from './image.mjs';
import { verifySignature } from './auth.mjs';
import { createCompactQueue, resolveCompactTargets } from './compact.mjs';

export const IMPORT_PATH = '/api/images/import';
export const COMPACT_PATH = '/api/images/compact';
export const TIMESTAMP_HEADER = 'x-rilog-image-timestamp';
export const SIGNATURE_HEADER = 'x-rilog-image-signature';

// Spring ImagePurpose와 같은 목적별 디렉터리
const PURPOSE_DIRECTORIES = { PROFILE: 'profiles', CONTENT: 'images' };
// 압축 요청 하나의 시한. 대기열 대기, S3 읽기, 변환, 저장을 모두 포함한다. 시한이 지나도 진행 중인 변환 하나(최대 10초)는
// 끝나야 응답하므로 Nginx proxy_read_timeout과 Spring 압축 read-timeout은 이 값에 10초를 더한 것보다 길게 둔다.
const COMPACT_DEADLINE_MS = 45_000;
const COMPACT_MAX_WAITING = 10;

// 서명이 본문 해시를 포함하므로 본문을 수신 바이트로 받아 검증한 뒤 파싱한다.
function parseBody(body) {
  try {
    return JSON.parse(body.toString('utf8'));
  } catch {
    throw new ApiError(400, 'INVALID_JSON', '유효한 JSON이 필요합니다.');
  }
}

function validateImportTarget(body) {
  const { userId, imagePurpose } = body ?? {};
  if (!Number.isSafeInteger(userId) || userId <= 0 || !Object.hasOwn(PURPOSE_DIRECTORIES, imagePurpose)) {
    throw new ApiError(400, 'INVALID_REQUEST', 'userId와 imagePurpose가 올바르지 않습니다.');
  }
  return { userId, directory: PURPOSE_DIRECTORIES[imagePurpose] };
}

function verifyRequest(config, path, req, body, now) {
  verifySignature({
    secret: config.secret,
    path,
    body,
    timestamp: req.get(TIMESTAMP_HEADER),
    signature: req.get(SIGNATURE_HEADER),
    now,
  });
}

function storageUnavailable(event, error, fields = {}) {
  console.error(JSON.stringify({ event, ...fields, name: error.name, requestId: error.$metadata?.requestId }));
  return new ApiError(502, 'STORAGE_UNAVAILABLE', '이미지를 저장할 수 없습니다.');
}

export function createApp({
  config, upload, readOriginal, putCompact,
  download = downloadImage, normalize = normalizeImage, compact = compactImage,
  now = Date.now, compactDeadlineMs = COMPACT_DEADLINE_MS,
}) {
  const app = express();
  app.disable('x-powered-by');
  let active = false;
  const runCompact = createCompactQueue({ maxWaiting: COMPACT_MAX_WAITING });

  app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
  // Spring은 sourceUrl을 4,096자(문자 수)까지 받는다. 비ASCII는 문자당 최대 3바이트, JSON 이스케이프는 6바이트라
  // 최악 약 24KiB이므로 여유를 두고 32KiB로 둔다. nginx client_max_body_size와 같이 바꾼다.
  app.post(IMPORT_PATH, express.raw({ type: () => true, limit: '32kb' }), async (req, res, next) => {
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    try {
      verifyRequest(config, IMPORT_PATH, req, body, now());
    } catch (error) { return next(error); }

    if (active) return res.status(429).set('Retry-After', '2').json({ error: { code: 'BUSY', message: '잠시 후 다시 시도해주세요.' } });
    active = true;
    try {
      const request = parseBody(body);
      const { userId, directory } = validateImportTarget(request);
      const url = validateUrl(request.sourceUrl);
      const bytes = await normalize(await download(url));
      const key = `${config.rootDirectory}/${directory}/raw/${userId}-${randomUUID()}/original.webp`;
      try {
        await upload(key, bytes);
      } catch (error) {
        throw storageUnavailable('s3_upload_failed', error);
      }
      res.status(201).json({ key, url: `${config.imageBaseUrl}/${key}` });
    } catch (error) { next(error); }
    finally { active = false; }
  });

  // Spring이 원본을 사용 확정(CONFIRMED)한 뒤 호출한다. 같은 {userId}-{UUID}의 compact/{width}.webp를 만들고 덮어쓴다.
  app.post(COMPACT_PATH, express.raw({ type: () => true, limit: '4kb' }), async (req, res, next) => {
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    try {
      verifyRequest(config, COMPACT_PATH, req, body, now());
    } catch (error) { return next(error); }

    const signal = AbortSignal.timeout(compactDeadlineMs);
    const startedAt = Date.now();
    let objectKey;
    try {
      ({ objectKey } = parseBody(body) ?? {});
      const targets = resolveCompactTargets(config.rootDirectory, objectKey);
      await runCompact(async () => {
        const source = await readSource(objectKey, signal);
        const outputs = await compact(source, targets.map(({ width }) => width), { signal });
        for (const [index, { key }] of targets.entries()) {
          signal.throwIfAborted();
          try {
            await putCompact(key, outputs[index].data, signal);
          } catch (error) {
            if (signal.aborted) throw error;
            throw storageUnavailable('s3_compact_upload_failed', error, { key });
          }
        }
      }, signal);
      console.log(JSON.stringify({ event: 'image_compacted', key: objectKey, durationMs: Date.now() - startedAt }));
      res.json({ keys: targets.map(({ key }) => key) });
    } catch (error) {
      const failure = !(error instanceof ApiError) && signal.aborted
        ? new ApiError(504, 'COMPACT_TIMEOUT', '이미지 압축 시간이 초과되었습니다.')
        : error;
      // 서명을 통과한 요청의 실패는 원인과 관계없이 원본 key와 함께 남긴다. 서명 실패(401)는 본문을 믿을 수 없어 남기지 않는다.
      console.error(JSON.stringify({
        event: 'image_compact_failed',
        key: objectKey ?? null,
        status: failure instanceof ApiError ? failure.status : 500,
        code: failure instanceof ApiError ? failure.code : 'INTERNAL_ERROR',
        name: error.name,
        durationMs: Date.now() - startedAt,
      }));
      next(failure);
    }
  });

  async function readSource(objectKey, signal) {
    try {
      return await readOriginal(objectKey, signal);
    } catch (error) {
      if (error instanceof ApiError || signal.aborted) throw error;
      if (error.name === 'NoSuchKey') throw new ApiError(404, 'SOURCE_NOT_FOUND', '압축할 원본 이미지가 없습니다.');
      console.error(JSON.stringify({ event: 's3_read_failed', key: objectKey, name: error.name, requestId: error.$metadata?.requestId }));
      throw new ApiError(502, 'STORAGE_UNAVAILABLE', '원본 이미지를 읽을 수 없습니다.');
    }
  }
  app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: '요청한 API가 없습니다.' } }));
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof ApiError) return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    if (error.type === 'entity.too.large') return res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: '요청 본문이 너무 큽니다.' } });
    console.error(JSON.stringify({ event: 'request_failed', name: error.name }));
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '이미지 처리 중 오류가 발생했습니다.' } });
  });
  return app;
}
