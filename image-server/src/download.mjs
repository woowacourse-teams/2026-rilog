import https from 'node:https';
import dns from 'node:dns';
import { isIP } from 'node:net';
import ipaddr from 'ipaddr.js';

export const MAX_BYTES = 10 * 1024 * 1024;

export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function validateUrl(source) {
  try {
    if (typeof source !== 'string' || !source || source.length > 4096) throw new Error();
    const url = new URL(source);
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    if (url.protocol !== 'https:' || !hostname || url.username || url.password ||
        (url.port && url.port !== '443') || isIP(hostname)) throw new Error();
    return url;
  } catch {
    throw new ApiError(400, 'INVALID_URL', 'HTTPS 이미지 URL이 필요합니다.');
  }
}

// The HTTP client connects to these validated records, without another DNS lookup.
export function createPublicLookup(resolve = dns.lookup) {
  return (hostname, options, callback) => {
    resolve(hostname, { all: true }, (error, records) => {
      if (error) return callback(error);
      const safe = records.length > 0 && records.every(({ address }) => {
        try { return ipaddr.process(address).range() === 'unicast'; }
        catch { return false; }
      });
      if (!safe) return callback(new ApiError(400, 'UNSAFE_HOST', '허용되지 않는 이미지 호스트입니다.'));
      const selected = records[0];
      if (options.all) callback(null, [selected]);
      else callback(null, selected.address, selected.family);
    });
  };
}

export function downloadImage(url, { request = https.get, maxBytes = MAX_BYTES } = {}) {
  return new Promise((resolve, reject) => {
    const signal = AbortSignal.timeout(10_000);
    const req = request(url, {
      lookup: createPublicLookup(),
      agent: false,
      signal,
      maxHeaderSize: 16 * 1024,
      headers: { 'Accept-Encoding': 'identity', 'User-Agent': 'Rilog-Image-Importer/1.0' },
    }, async (response) => {
      try {
        if (response.statusCode !== 200) {
          throw new ApiError(502, 'SOURCE_REJECTED', '외부 이미지를 가져올 수 없습니다. 리다이렉트는 지원하지 않습니다.');
        }
        if ((response.headers['content-encoding'] ?? 'identity').toLowerCase() !== 'identity') {
          throw new ApiError(422, 'UNSUPPORTED_ENCODING', '압축된 HTTP 응답은 지원하지 않습니다.');
        }
        const declared = Number(response.headers['content-length']);
        if (Number.isFinite(declared) && declared > maxBytes) {
          throw new ApiError(413, 'IMAGE_TOO_LARGE', '이미지는 최대 10MiB입니다.');
        }
        const chunks = [];
        let size = 0;
        for await (const chunk of response) {
          size += chunk.length;
          if (size > maxBytes) throw new ApiError(413, 'IMAGE_TOO_LARGE', '이미지는 최대 10MiB입니다.');
          chunks.push(chunk);
        }
        resolve(Buffer.concat(chunks, size));
      } catch (error) {
        response.destroy();
        reject(error instanceof ApiError ? error : signal.aborted
          ? new ApiError(504, 'SOURCE_TIMEOUT', '이미지 다운로드 시간이 초과되었습니다.')
          : new ApiError(502, 'SOURCE_UNAVAILABLE', '이미지 다운로드가 중단되었습니다.'));
      }
    });
    req.on('error', (error) => {
      reject(error instanceof ApiError ? error : signal.aborted
        ? new ApiError(504, 'SOURCE_TIMEOUT', '이미지 다운로드 시간이 초과되었습니다.')
        : new ApiError(502, 'SOURCE_UNAVAILABLE', '외부 이미지 서버에 연결할 수 없습니다.'));
    });
  });
}
