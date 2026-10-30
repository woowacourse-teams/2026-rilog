import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { loadConfig } from './config.mjs';
import { createApp } from './app.mjs';

const config = loadConfig();
const s3 = new S3Client({ region: config.region, maxAttempts: 2 });
const app = createApp({
  config,
  upload: (key, bytes) => s3.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: bytes,
    ContentType: 'image/webp',
    // presigned 업로드와 같이 임시 상태로 저장하고, 사용 확정 시 Spring이 CONFIRMED로 바꾼다.
    Tagging: 'status=TEMPORARY',
    CacheControl: 'public, max-age=31536000, immutable',
  }), { abortSignal: AbortSignal.timeout(15_000) }),
});

const server = app.listen(8000, '0.0.0.0', () => console.log('Rilog image API listening on :8000'));
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.once(signal, () => {
    server.close(() => { s3.destroy(); process.exit(0); });
    setTimeout(() => process.exit(1), 30_000).unref();
  });
}
