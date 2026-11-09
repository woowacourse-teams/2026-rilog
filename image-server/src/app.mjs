import express from 'express';
import { randomUUID } from 'node:crypto';
import { ApiError, validateUrl, downloadImage } from './download.mjs';
import { compactImage, normalizeImage } from './image.mjs';
import { verifySignature } from './auth.mjs';
import { resolveCompactTargets } from './compact.mjs';
import { createJobQueue } from './queue.mjs';

export const IMPORT_PATH = '/api/images/import';
export const COMPACT_PATH = '/api/images/compact';
export const TIMESTAMP_HEADER = 'x-rilog-image-timestamp';
export const SIGNATURE_HEADER = 'x-rilog-image-signature';

// Spring ImagePurpose와 같은 목적별 디렉터리
const PURPOSE_DIRECTORIES = { PROFILE: 'profiles', CONTENT: 'images' };
// 압축 요청 하나의 시한. 대기열 대기, S3 읽기, 변환, 저장을 모두 포함한다. 시한이 지나도 진행 중인 변환 하나(최대 5초)는
// 끝나야 응답하므로 Nginx proxy_read_timeout과 Spring 압축 read-timeout은 이 값에 5초를 더한 것보다 길게 둔다.
// 동시 요청 4건(Spring 스레드 2개 × 개발·운영 2대) × 건당 약 5초 × 여유 1.25배. 대기열은 동시 요청 수 - 1이다.
const COMPACT_DEADLINE_MS = 25_000;
const COMPACT_MAX_WAITING = 3;

// import 대기열 큐 도입. 프론트가 외부 이미지 여러 장을 동시에 보내도 바로 429로 거절하지 않고 한 장씩 차례로 처리하기 위함.
// - 대기 시간 상한: Spring import read-timeout(40초) 안에 응답하려면 다운로드(최대 10초), 변환, S3 업로드 시간을
//   빼야 한다. 그 안에 차례가 오지 않으면 BUSY(429)로 끝내서, Spring이 이미 포기한 요청을 변환하지 않는다.
// - 대기 건수 상한: 원본을 줄인 뒤 import 변환은 한 장에 약 0.3~1.6초다. 20초 동안 처리할 수 있는 건수에 맞춰 10건으로 둔다.
// - 머무름 상한: 다운로드는 대기열 밖에서 먼저 하므로, 다운로드 중이거나 기다리는 요청도 원본(최대 10MiB)을 메모리에 들고 있다.
//   실행 1건 + 대기 10건을 넘는 요청은 다운로드 전에 거절해 들고 있는 원본 수를 묶는다.
const IMPORT_QUEUE_WAIT_MS = 20_000;
const IMPORT_MAX_WAITING = 10;
const IMPORT_MAX_IN_FLIGHT = IMPORT_MAX_WAITING + 1;

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

// 대기열이 가득 찼거나 대기 시한이 지났을 때의 429 응답. Retry-After는 오류 처리기에서 붙인다.
const busy = () => new ApiError(429, 'BUSY', '잠시 후 다시 시도해주세요.');

function storageUnavailable(event, error, fields = {}) {
  console.error(JSON.stringify({ event, ...fields, name: error.name, requestId: error.$metadata?.requestId }));
  return new ApiError(502, 'STORAGE_UNAVAILABLE', '이미지를 저장할 수 없습니다.');
}

export function createApp({
  config, upload, readOriginal, putCompact,
  download = downloadImage, normalize = normalizeImage, compact = compactImage,
  now = Date.now, compactDeadlineMs = COMPACT_DEADLINE_MS, importQueueWaitMs = IMPORT_QUEUE_WAIT_MS,
}) {
  const app = express();
  app.disable('x-powered-by');
  // import와 압축은 대기열을 따로!! 사용. 한쪽이 밀려도 다른 쪽은 기다리지 않는다.
  const runImport = createJobQueue({ maxWaiting: IMPORT_MAX_WAITING });
  const runCompact = createJobQueue({ maxWaiting: COMPACT_MAX_WAITING });
  // 다운로드 중, 대기 중, 변환·업로드 중인 import 요청 수.
  let importsInFlight = 0;

  app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
  // Spring은 sourceUrl을 4,096자(문자 수)까지 받는다. 비ASCII는 문자당 최대 3바이트, JSON 이스케이프는 6바이트라
  // 최악 약 24KiB이므로 여유를 두고 32KiB로 둔다. nginx client_max_body_size와 같이 바꾼다.
  app.post(IMPORT_PATH, express.raw({ type: () => true, limit: '32kb' }), async (req, res, next) => {
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    try {
      verifyRequest(config, IMPORT_PATH, req, body, now());
    } catch (error) { return next(error); }

    if (importsInFlight >= IMPORT_MAX_IN_FLIGHT) return next(busy());
    importsInFlight += 1;
    // 응답을 보내기 전에 연결이 닫히면(Spring 타임아웃 등) 받을 사람이 없으므로 기다리던 변환을 대기열에서 뺀다.
    const disconnected = new AbortController();
    res.on('close', () => { if (!res.writableFinished) disconnected.abort(); });
    let waitSignal;
    try {
      const request = parseBody(body);
      const { userId, directory } = validateImportTarget(request);
      const url = validateUrl(request.sourceUrl);
      // 다운로드는 네트워크 대기가 대부분이라 대기열 밖에서 한다. 변환 중인 앞 요청과 동시에 받아 두면 차례가 왔을 때 바로 변환한다.
      const source = await download(url);
      // 대기 시간은 대기열에 들어가는 지금부터 잰다. 시한이 지나거나 연결이 끊기면 대기열에서 빠진다.
      waitSignal = AbortSignal.any([AbortSignal.timeout(importQueueWaitMs), disconnected.signal]);
      const bytes = await runImport(() => normalize(source), waitSignal);
      const key = `${config.rootDirectory}/${directory}/raw/${userId}-${randomUUID()}/original.webp`;
      try {
        await upload(key, bytes);
      } catch (error) {
        throw storageUnavailable('s3_upload_failed', error);
      }
      res.status(201).json({ key, url: `${config.imageBaseUrl}/${key}` });
    } catch (error) {
      // 대기열에서 시한이 지나 빠진 경우(대기열이 signal.reason으로 실패시킨다)는 서버가 바쁜 것이므로 BUSY(429)로 알린다.
      if (waitSignal?.aborted && error === waitSignal.reason) return next(busy());
      next(error);
    } finally {
      importsInFlight -= 1;
    }
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
    if (error instanceof ApiError) {
      if (error.code === 'BUSY') res.set('Retry-After', '2');
      return res.status(error.status).json({ error: { code: error.code, message: error.message } });
    }
    if (error.type === 'entity.too.large') return res.status(413).json({ error: { code: 'BODY_TOO_LARGE', message: '요청 본문이 너무 큽니다.' } });
    console.error(JSON.stringify({ event: 'request_failed', name: error.name }));
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '이미지 처리 중 오류가 발생했습니다.' } });
  });
  return app;
}
