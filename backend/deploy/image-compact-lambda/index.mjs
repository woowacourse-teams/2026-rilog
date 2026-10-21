import { createHash, createHmac } from 'node:crypto';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import sharp from 'sharp';

// {root}/{images|profiles}/raw/{userId}-{UUID}/original.{ext}
const ORIGINAL_KEY_PATTERN =
  /^.+\/(?:images|profiles)\/raw\/\d+-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\/original\.(?<extension>[A-Za-z0-9]+)$/;

// 여기에 없는 확장자(heic, svg, gif, 새로 추가된 확장자)는 변환하지 않고 원본을 그대로 쓴다.
const CONVERTIBLE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif']);
const WEBP_QUALITY = 80;

// 서명 대상 경로는 서버 컨트롤러 상수와 같아야 한다. base URL에 프록시 접두사가 붙어도 서명은 이 경로로 한다.
const UPLOAD_URLS_PATH = '/internal/v1/image-compactions/upload-urls';
const REQUEST_TIMEOUT_MS = 10_000;

const s3 = new S3Client({});

export const handler = (event) => handleEvent(event, s3);

export async function handleEvent(event, client, options = {}) {
  const config = options.config ?? readConfig();
  const fetchFn = options.fetch ?? fetch;
  const now = options.now ?? (() => Date.now());

  for (const record of event.Records ?? []) {
    const bucket = record.s3.bucket.name;
    // S3 이벤트의 key는 URL 인코딩되어 있고 공백은 +로 온다.
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
    await compact({ client, config, fetchFn, now }, bucket, key);
  }
}

async function compact(context, bucket, key) {
  const match = ORIGINAL_KEY_PATTERN.exec(key);
  if (!match) {
    log('skip', { key, reason: 'not_original_key' });
    return;
  }

  const { extension } = match.groups;
  if (!CONVERTIBLE_EXTENSIONS.has(extension.toLowerCase())) {
    log('skip', { key, reason: 'unsupported_extension', extension });
    return;
  }

  const input = await readObject(context.client, bucket, key);
  if (!input) {
    log('skip', { key, reason: 'source_not_found' });
    return;
  }

  const { width, height, orientation = 1, pages = 1 } = await sharp(input).metadata();
  // Orientation 5~8은 90도 또는 270도 회전이라 돌린 뒤에는 가로와 세로가 바뀐다.
  const sourceWidth = orientation >= 5 ? height : width;
  if (pages > 1) {
    log('skip', { key, reason: 'animated_image', pages });
    return;
  }

  // 압축 너비와 업로드 위치는 서버가 정한다.
  const uploads = await requestUploadUrls(context, key);

  // EXIF Orientation이 있으면 그 방향대로 픽셀을 돌리고, 없으면 그대로 둔다.
  // 그 뒤 keepMetadata/withMetadata를 호출하지 않으므로 sharp가 EXIF(GPS 포함), ICC, XMP, IPTC를 모두 제거한다.
  const encode = (targetWidth) => sharp(input, { failOn: 'none' })
    .rotate()
    .resize({ width: targetWidth, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  // 원본보다 크거나 같은 너비는 원본 크기 변환본 하나를 같이 쓴다.
  let originalSize = null;
  const encodeFor = (targetWidth) => {
    if (targetWidth < sourceWidth) {
      return encode(targetWidth);
    }
    originalSize ??= encode(sourceWidth);
    return originalSize;
  };

  await Promise.all(uploads.map(async (upload) => {
    const body = await encodeFor(upload.width);
    await putObject(context.fetchFn, upload, body);
  }));

  log('compacted', { key, sourceWidth, widths: uploads.map((upload) => upload.width) });
}

async function requestUploadUrls({ config, fetchFn, now }, objectKey) {
  const body = JSON.stringify({ objectKey });
  const timestamp = String(Math.floor(now() / 1000));
  const bodyHash = createHash('sha256').update(body, 'utf8').digest('hex');
  const payload = `${timestamp}\nPOST\n${UPLOAD_URLS_PATH}\n${bodyHash}`;
  const signature = 'v1=' + createHmac('sha256', config.secret).update(payload, 'utf8').digest('hex');

  const response = await fetchFn(`${config.apiBaseUrl}${UPLOAD_URLS_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Rilog-Lambda-Timestamp': timestamp,
      'X-Rilog-Lambda-Signature': signature,
    },
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    // 4xx도 재시도 대상으로 둔다. 비밀키 교체 중의 401은 잠시 뒤 성공할 수 있고, 재시도가 끝나면 실패 SQS로 남는다.
    throw new Error(`upload URL request failed with HTTP ${response.status}`);
  }

  const uploads = (await response.json())?.data?.uploads;
  if (!Array.isArray(uploads) || uploads.length === 0) {
    throw new Error('upload URL response has no uploads');
  }
  return uploads;
}

async function putObject(fetchFn, upload, body) {
  const response = await fetchFn(upload.uploadUrl, {
    method: 'PUT',
    headers: signedHeaders(upload.headers),
    body,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  // If-None-Match: * 조건이라 이미 있는 압축본은 412로 거절된다. 재시도 중 먼저 올라간 너비이므로 성공으로 본다.
  if (response.status === 412) {
    log('upload_exists', { width: upload.width });
    return;
  }
  if (!response.ok) {
    throw new Error(`compact upload failed with HTTP ${response.status} (width ${upload.width})`);
  }
}

// presigned URL에 서명된 헤더를 그대로 보낸다. host는 fetch가 URL로 채운다.
function signedHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers)
      .filter(([name]) => name.toLowerCase() !== 'host')
      .map(([name, values]) => [name, [].concat(values).join(',')]),
  );
}

async function readObject(client, bucket, key) {
  try {
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return Buffer.from(await response.Body.transformToByteArray());
  } catch (error) {
    // 이벤트 처리 전에 원본이 지워졌으면 재시도해도 소용없으므로 건너뛴다.
    if (error.name === 'NoSuchKey') {
      return null;
    }
    throw error;
  }
}

function readConfig() {
  const apiBaseUrl = process.env.RILOG_API_BASE_URL?.replace(/\/+$/, '');
  const secret = process.env.RILOG_LAMBDA_SECRET;
  if (!apiBaseUrl?.startsWith('https://')) {
    throw new Error('RILOG_API_BASE_URL must be an https URL');
  }
  if (!secret || secret.length < 32) {
    throw new Error('RILOG_LAMBDA_SECRET must be at least 32 characters');
  }
  return { apiBaseUrl, secret };
}

function log(event, fields) {
  console.log(JSON.stringify({ event: `image_compact_${event}`, ...fields }));
}
