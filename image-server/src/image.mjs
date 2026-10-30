import sharp from 'sharp';
import { ApiError, MAX_BYTES } from './download.mjs';

sharp.concurrency(1);
sharp.cache(false);
const MAX_PIXELS = 16_000_000;
// 압축 원본은 Spring presigned 업로드(10MiB)로 올라온 사용자 사진이다. 4800만 화소 휴대폰 사진까지 받는다.
const MAX_COMPACT_PIXELS = 50_000_000;
const COMPACT_WEBP_QUALITY = 80;
const ENCODE_TIMEOUT_SECONDS = 10;

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
    const result = await image.rotate().webp({ quality: 85 }).timeout({ seconds: 10 }).toBuffer();
    if (result.length > MAX_BYTES) throw new ApiError(413, 'IMAGE_TOO_LARGE', '변환 결과가 너무 큽니다.');
    return result;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(422, 'INVALID_IMAGE', '손상되었거나 처리 한도를 초과한 이미지입니다.');
  }
}

// 너비마다 WebP 압축본을 만든다. 원본보다 크거나 같은 너비는 확대하지 않고 원본 너비로 한 번만 변환해 같이 쓴다.
// 메모리를 아끼려고 너비별 변환을 순서대로 하고, 너비 사이마다 요청 시한(signal)을 확인한다.
export async function compactImage(data, widths, { signal } = {}) {
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
    if (!encoded.has(targetWidth)) encoded.set(targetWidth, await encodeWebp(data, targetWidth));
    results.push({ width, data: encoded.get(targetWidth) });
  }
  return results;
}

// keepMetadata/withMetadata를 호출하지 않으므로 방향 보정 뒤 EXIF(GPS 포함), ICC, XMP를 모두 제거한다.
async function encodeWebp(data, width) {
  try {
    return await sharp(data, { limitInputPixels: MAX_COMPACT_PIXELS, failOn: 'none' })
      .autoOrient()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: COMPACT_WEBP_QUALITY })
      .timeout({ seconds: ENCODE_TIMEOUT_SECONDS })
      .toBuffer();
  } catch {
    throw new ApiError(422, 'INVALID_IMAGE', '손상되었거나 처리 한도를 초과한 이미지입니다.');
  }
}
