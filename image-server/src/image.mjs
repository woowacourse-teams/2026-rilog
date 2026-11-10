import sharp from 'sharp';
import { ApiError, MAX_BYTES } from './download.mjs';

sharp.concurrency(1);
sharp.cache(false);
const MAX_PIXELS = 16_000_000;
// import 원본의 최대 너비. 압축본의 가장 큰 너비(COMPACT_WIDTHS의 2000)와 맞춰, 화면에 보이는 크기는 그대로 두고
// 그보다 큰 원본은 저장하지 않는다. 원본을 그대로 변환하면 16MP WebP 한 장이 약 330MiB를 써서 512MiB 컨테이너가
// 압축과 겹칠 때 OOM이 났다. 줄이면 같은 입력이 약 120MiB, 시간은 1/3로 준다(docs/reports 2026-11-05 보고서 9장).
const IMPORT_MAX_WIDTH = 2000;
// 압축 원본은 Spring presigned 업로드(10MiB)로 올라온 사용자 사진이다. 4800만 화소 휴대폰 사진까지 받는다.
const MAX_COMPACT_PIXELS = 50_000_000;
const COMPACT_WEBP_QUALITY = 80;
// 너비 4개가 모두 상한까지 걸려도 합계 20초로 요청 시한(25초) 안에 들어오는 값. 넘으면 비정상 작업으로 보고 끊는다.
const ENCODE_TIMEOUT_SECONDS = 5;

function hasSupportedSignature(data) {
  return (data.length >= 3 && data.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) ||
    (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) ||
    (data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP');
}

export async function normalizeImage(data) {
  if (!hasSupportedSignature(data)) throw new ApiError(422, 'INVALID_IMAGE', '정적 JPEG, PNG, WebP 이미지만 지원합니다.');
  try {
    const image = sharp(data, { limitInputPixels: MAX_PIXELS, failOn: 'warning' });
    const meta = await image.metadata();
    if (!['jpeg', 'png', 'webp'].includes(meta.format) || (meta.pages ?? 1) !== 1) {
      throw new ApiError(422, 'INVALID_IMAGE', '정적 JPEG, PNG, WebP 이미지만 지원합니다.');
    }
    const result = await image
      // EXIF 방향을 먼저 반영해야 세로 사진도 "보이는 너비" 기준으로 줄인다.
      .rotate()
      // 너비가 2000보다 크면 비율을 유지해 2000으로 줄이고, 작으면 확대하지 않고 그대로 둔다.
      // JPEG와 WebP는 libvips가 처음부터 줄인 크기로 디코드(shrink-on-load)해서, 원본 크기의 화소를
      // PNG는 이 방식이 없어 원본 크기로 디코드한 뒤 줄이므로, 인코딩할 화소가 줄어드는 만큼만 가벼워진다.
      .resize({ width: IMPORT_MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: 85 })
      .timeout({ seconds: 10 })
      .toBuffer();
    if (result.length > MAX_BYTES) throw new ApiError(413, 'IMAGE_TOO_LARGE', '변환 결과가 너무 큽니다.');
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, 'INVALID_IMAGE', '손상되었거나 처리 한도를 초과한 이미지입니다.');
  }
}

// 너비마다 WebP 압축본을 만든다. 원본보다 크거나 같은 너비는 확대하지 않고 원본 너비로 한 번만 변환해 같이 쓴다.
// 메모리를 아끼려고 너비별 변환을 순서대로 하고, 너비 사이마다 요청 시한(signal)을 확인한다.
export async function compactImage(data, widths, { signal, encodeTimeoutSeconds = ENCODE_TIMEOUT_SECONDS } = {}) {
  let sourceWidth;
  try {
    const meta = await sharp(data, { limitInputPixels: MAX_COMPACT_PIXELS }).metadata();
    if ((meta.pages ?? 1) !== 1) throw new ApiError(422, 'UNSUPPORTED_IMAGE', '움직이는 이미지는 압축하지 않습니다.');
    // autoOrient는 EXIF Orientation을 반영한 크기다. 5~8은 90도 회전이라 가로와 세로가 바뀐다.
    sourceWidth = meta.autoOrient.width;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, 'INVALID_IMAGE', '손상되었거나 처리 한도를 초과한 이미지입니다.');
  }

  const encoded = new Map();
  const results = [];
  for (const width of widths) {
    signal?.throwIfAborted();
    const targetWidth = Math.min(width, sourceWidth);
    if (!encoded.has(targetWidth)) encoded.set(targetWidth, await encodeWebp(data, targetWidth, encodeTimeoutSeconds));
    results.push({ width, data: encoded.get(targetWidth) });
  }
  return results;
}

// keepMetadata/withMetadata를 호출하지 않으므로 방향 보정 뒤 EXIF(GPS 포함), ICC, XMP를 모두 제거한다.
// resize가 있으므로 JPEG와 WebP 원본은 목표 너비 근처까지 줄인 크기로 디코드된다(shrink-on-load).
// 그래서 2,450만 화소 휴대폰 사진도 너비 2000 압축 한 번에 약 150MiB 안에서 끝난다.
async function encodeWebp(data, width, timeoutSeconds) {
  try {
    return await sharp(data, { limitInputPixels: MAX_COMPACT_PIXELS, failOn: 'none' })
      .autoOrient()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: COMPACT_WEBP_QUALITY })
      .timeout({ seconds: timeoutSeconds })
      .toBuffer();
  } catch (error) {
    // sharp는 timeout 초과를 별도 타입 없이 "timeout: N% complete" 메시지로만 알린다.
    if (error.message?.startsWith('timeout:')) throw new ApiError(504, 'ENCODE_TIMEOUT', '이미지 변환 시간이 초과되었습니다.');
    throw new ApiError(422, 'INVALID_IMAGE', '손상되었거나 처리 한도를 초과한 이미지입니다.');
  }
}
