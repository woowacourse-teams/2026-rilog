import express from 'express';
import { randomUUID } from 'node:crypto';
import { ApiError, validateUrl, downloadImage } from './download.mjs';
import { normalizeImage } from './image.mjs';

export function createApp({ config, upload, download = downloadImage, normalize = normalizeImage }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '8kb' }));
  let active = false;

  app.get('/healthz', (req, res) => res.json({ status: 'ok' }));
  app.post('/api/images/import', async (req, res, next) => {
    if (active) return res.status(429).set('Retry-After', '2').json({ error: { code: 'BUSY', message: '잠시 후 다시 시도해주세요.' } });
    active = true;
    try {
      const url = validateUrl(req.body?.sourceUrl);
      const bytes = await normalize(await download(url));
      const key = `${config.prefix}/${randomUUID()}.webp`;
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
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: { code: 'INVALID_JSON', message: '유효한 JSON이 필요합니다.' } });
    console.error(JSON.stringify({ event: 'request_failed', name: error.name }));
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: '이미지 처리 중 오류가 발생했습니다.' } });
  });
  return app;
}
