import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { loadConfig } from './config.mjs';
import { createApp } from './app.mjs';
import { ApiError } from './download.mjs';

// Spring presigned 업로드와 가져오기 저장의 상한은 10MiB다. 그보다 큰 원본은 정상 경로로 올라온 객체가 아니다.
const MAX_COMPACT_SOURCE_BYTES = 10 * 1024 * 1024;

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
  readOriginal: async (key, signal) => {
    const response = await s3.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }), { abortSignal: signal });
    if (response.ContentLength > MAX_COMPACT_SOURCE_BYTES) {
      response.Body.destroy();
      throw new ApiError(413, 'IMAGE_TOO_LARGE', '원본 이미지가 너무 큽니다.');
    }
    return Buffer.from(await response.Body.transformToByteArray());
  },
  // 압축본은 사용 확정 뒤에만 만들므로 TEMPORARY 태그를 붙이지 않는다. 같은 원본을 다시 확정하면 같은 key에 덮어쓴다.
  putCompact: (key, bytes, signal) => s3.send(new PutObjectCommand({
    Bucket: config.bucket,
    Key: key,
    Body: bytes,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000, immutable',
  }), { abortSignal: signal }),
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
