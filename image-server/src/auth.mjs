import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { ApiError } from './download.mjs';

const SIGNATURE_PREFIX = 'v1=';
const MAX_AGE_SECONDS = 300;
// 미래 시각은 시계 오차로만 설명되므로 과거만큼 넓게 열면 가로챈 서명의 유효 시간만 늘어난다.
const MAX_FUTURE_SKEW_SECONDS = 30;

// Spring과 같은 서명 대상: timestamp \n POST \n path \n sha256(body). 본문 해시는 수신 바이트로 계산한다.
export function sign(secret, timestamp, path, body) {
  const bodyHash = createHash('sha256').update(body).digest('hex');
  return createHmac('sha256', secret).update(`${timestamp}\nPOST\n${path}\n${bodyHash}`).digest();
}

export function verifySignature({ secret, path, body, timestamp, signature, now = Date.now() }) {
  const invalid = new ApiError(401, 'INVALID_SIGNATURE', '요청 서명이 유효하지 않습니다.');
  if (typeof timestamp !== 'string' || !/^\d{1,12}$/.test(timestamp)) throw invalid;
  const age = Math.floor(now / 1000) - Number(timestamp);
  if (age > MAX_AGE_SECONDS || age < -MAX_FUTURE_SKEW_SECONDS) throw invalid;
  if (typeof signature !== 'string' || !signature.startsWith(SIGNATURE_PREFIX)) throw invalid;
  const hex = signature.slice(SIGNATURE_PREFIX.length);
  if (!/^[\da-f]{64}$/i.test(hex)) throw invalid;
  if (!timingSafeEqual(Buffer.from(hex, 'hex'), sign(secret, timestamp, path, body))) throw invalid;
}
