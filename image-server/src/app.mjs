import express from 'express';
import { randomUUID } from 'node:crypto';
import { ApiError, validateUrl, downloadImage } from './download.mjs';
import { normalizeImage } from './image.mjs';
import { verifySignature } from './auth.mjs';

export const IMPORT_PATH = '/api/images/import';
export const TIMESTAMP_HEADER = 'x-rilog-image-timestamp';
export const SIGNATURE_HEADER = 'x-rilog-image-signature';

// Spring ImagePurpose와 같은 목적별 디렉터리
const PURPOSE_DIRECTORIES = { PROFILE: 'profiles', CONTENT: 'images' };

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

export function createApp({ config, upload, download = downloadImage, normalize = normalizeImage, now = Date.now }) {
  const app = express();
  app.disable('x-powered-by');
  let active = false;

  app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
  app.post(IMPORT_PATH, express.raw({ type: () => true, limit: '8kb' }), async (req, res, next) => {
    const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    try {
      verifySignature({
        secret: config.secret,
        path: IMPORT_PATH,
        body,
        timestamp: req.get(TIMESTAMP_HEADER),
        signature: req.get(SIGNATURE_HEADER),
        now: now(),
      });
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
        console.error(JSON.stringify({ event: 's3_upload_failed', name: error.name, requestId: error.$metadata?.requestId }));
        throw new ApiError(502, 'STORAGE_UNAVAILABLE', '이미지를 저장할 수 없습니다.');
      }
      res.status(201).json({ key, url: `${config.imageBaseUrl}/${key}` });
    } catch (error) { next(error); }
    finally { active = false; }
  });
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
