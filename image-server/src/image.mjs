import sharp from 'sharp';
import { ApiError, MAX_BYTES } from './download.mjs';

sharp.concurrency(1);
sharp.cache(false);
const MAX_PIXELS = 16_000_000;

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
