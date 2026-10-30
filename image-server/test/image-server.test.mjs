import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import sharp from 'sharp';
import { createApp } from '../src/app.mjs';
import { createPublicLookup, downloadImage, validateUrl } from '../src/download.mjs';
import { compactImage, normalizeImage } from '../src/image.mjs';
import { createCompactQueue, resolveCompactTargets } from '../src/compact.mjs';
import { loadConfig } from '../src/config.mjs';
import { sign } from '../src/auth.mjs';

const SECRET = 'test-image-server-secret-at-least-32-chars';
const NOW = Date.parse('2026-10-29T00:00:00Z');
const config = { rootDirectory: 'rilog', imageBaseUrl: 'https://cdn.example.com', secret: SECRET };
const target = { userId: 7, imagePurpose: 'CONTENT' };

function signedHeaders(raw, { secret = SECRET, timestamp = String(NOW / 1000), path = '/api/images/import' } = {}) {
  return {
    'content-type': 'application/json',
    'x-rilog-image-timestamp': timestamp,
    'x-rilog-image-signature': `v1=${sign(secret, timestamp, path, Buffer.from(raw)).toString('hex')}`,
  };
}

test('URL policy rejects credentials, IP literals, non-HTTPS and alternate ports', () => {
  for (const source of [null, '', 'file:///etc/passwd', 'http://example.com/a', 'https://127.1/a', 'https://[::1]/a', 'https://a:b@example.com/a', 'https://example.com:8443/a']) {
    assert.throws(() => validateUrl(source), { code: 'INVALID_URL' });
  }
  assert.equal(validateUrl('https://example.com/a?token=test').hostname, 'example.com');
});

function lookup(records, all = true) {
  return new Promise((resolve, reject) => createPublicLookup((host, options, callback) => callback(null, records))(
    'example.com', { all }, (error, ...result) => error ? reject(error) : resolve(result),
  ));
}

test('DNS rejects private, loopback, link-local, mapped IPv6 and mixed answers', async () => {
  for (const address of ['127.0.0.1', '10.0.0.1', '169.254.169.254', '::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1']) {
    await assert.rejects(lookup([{ address, family: address.includes(':') ? 6 : 4 }]), { code: 'UNSAFE_HOST' });
  }
  await assert.rejects(lookup([{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.1', family: 4 }]), { code: 'UNSAFE_HOST' });
  await assert.rejects(lookup([]), { code: 'UNSAFE_HOST' });
});

test('DNS returns validated records to the socket without a second lookup', async () => {
  assert.deepEqual(await lookup([{ address: '8.8.8.8', family: 4 }]), [[{ address: '8.8.8.8', family: 4 }]]);
  assert.deepEqual(await lookup([{ address: '8.8.8.8', family: 4 }], false), ['8.8.8.8', 4]);
});

function requestWith(statusCode, chunks, headers = {}) {
  return (url, options, callback) => {
    assert.equal(options.agent, false);
    assert.equal(typeof options.lookup, 'function');
    const request = new EventEmitter();
    queueMicrotask(() => {
      const response = Readable.from(chunks);
      response.statusCode = statusCode;
      response.headers = headers;
      callback(response);
    });
    return request;
  };
}

test('download rejects redirects, oversized chunked bodies and compressed responses', async () => {
  const url = validateUrl('https://example.com/a');
  await assert.rejects(downloadImage(url, { request: requestWith(302, []) }), { code: 'SOURCE_REJECTED' });
  await assert.rejects(downloadImage(url, { request: requestWith(200, [Buffer.alloc(8), Buffer.alloc(9)]), maxBytes: 16 }), { code: 'IMAGE_TOO_LARGE' });
  await assert.rejects(downloadImage(url, { request: requestWith(200, [], { 'content-encoding': 'gzip' }) }), { code: 'UNSUPPORTED_ENCODING' });
  assert.deepEqual(await downloadImage(url, { request: requestWith(200, [Buffer.from('ok')]) }), Buffer.from('ok'));
});

test('image parser rejects HTML/SVG, corruption, animation and oversized dimensions', async () => {
  for (const bytes of [Buffer.from('<html/>'), Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'), Buffer.from([0xff, 0xd8, 0xff])]) {
    await assert.rejects(normalizeImage(bytes), { code: 'INVALID_IMAGE' });
  }
  const oversized = await sharp({ create: { width: 4001, height: 4000, channels: 3, background: 'red' } }).png().toBuffer();
  await assert.rejects(normalizeImage(oversized), { code: 'INVALID_IMAGE' });
  const frames = Buffer.from([255,0,0,255,0,0,255,0,0,255,0,0,0,0,255,0,0,255,0,0,255,0,0,255]);
  const animated = await sharp(frames, { raw: { width: 2, height: 4, channels: 3, pageHeight: 2 } }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
  await assert.rejects(normalizeImage(animated), { code: 'INVALID_IMAGE' });
});

test('image conversion generates a decodable WebP with original dimensions', async () => {
  const png = await sharp({ create: { width: 3, height: 2, channels: 4, background: '#ff000080' } }).png().toBuffer();
  const webp = await normalizeImage(png);
  const meta = await sharp(webp).metadata();
  assert.equal(meta.format, 'webp');
  assert.equal(meta.width, 3);
  assert.equal(meta.height, 2);
  assert.equal(meta.hasAlpha, true);
});

async function serve(t, dependencies) {
  const server = createApp({ config, now: () => NOW, ...dependencies }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    post: (body, options) => {
      const raw = JSON.stringify({ ...target, ...body });
      return fetch(`${base}/api/images/import`, { method: 'POST', headers: signedHeaders(raw, options), body: raw });
    },
    postRaw: (raw, headers) => fetch(`${base}/api/images/import`, { method: 'POST', headers, body: raw }),
    compact: (objectKey, options = {}) => {
      const raw = JSON.stringify({ objectKey });
      const headers = signedHeaders(raw, { path: '/api/images/compact', ...options });
      return fetch(`${base}/api/images/compact`, { method: 'POST', headers, body: raw });
    },
  };
}

test('import stores raw originals under the purpose directory of the signed user', async t => {
  const stored = [];
  const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: 'red' } }).png().toBuffer();
  const api = await serve(t, { download: async () => png, upload: async (key, data) => stored.push({ key, data }) });
  for (const [imagePurpose, directory] of [['CONTENT', 'images'], ['CONTENT', 'images'], ['PROFILE', 'profiles']]) {
    const response = await api.post({ sourceUrl: 'https://example.com/a.png', imagePurpose });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.url, `${config.imageBaseUrl}/${body.key}`);
    assert.match(body.key, new RegExp(`^rilog/${directory}/raw/7-[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}/original[.]webp$`));
  }
  assert.notEqual(stored[0].key, stored[1].key);
  assert.equal((await sharp(stored[0].data).metadata()).format, 'webp');
});

test('import rejects missing, forged, tampered and stale signatures before any work', async t => {
  let downloads = 0;
  const api = await serve(t, { download: async () => { downloads++; return Buffer.alloc(0); }, upload: async () => {} });
  const raw = JSON.stringify({ ...target, sourceUrl: 'https://example.com/a.png' });
  const tampered = JSON.stringify({ ...target, userId: 8, sourceUrl: 'https://example.com/a.png' });
  for (const request of [
    api.postRaw(raw, { 'content-type': 'application/json' }),
    api.postRaw(raw, signedHeaders(raw, { secret: 'another-image-server-secret-at-least-32-chars' })),
    api.postRaw(tampered, signedHeaders(raw)),
    api.postRaw(raw, signedHeaders(raw, { timestamp: String(NOW / 1000 - 301) })),
    api.postRaw(raw, signedHeaders(raw, { timestamp: String(NOW / 1000 + 31) })),
    api.postRaw('{', { 'content-type': 'application/json' }),
  ]) {
    const response = await request;
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error.code, 'INVALID_SIGNATURE');
  }
  assert.equal(downloads, 0);
});

test('import rejects signed requests without a valid user or purpose', async t => {
  const api = await serve(t, { download: async () => assert.fail('must not download'), upload: async () => {} });
  for (const body of [{ userId: 0 }, { userId: '7' }, { userId: null }, { imagePurpose: 'FILE' }, { imagePurpose: 'toString' }]) {
    const response = await api.post({ sourceUrl: 'https://example.com/a.png', ...body });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, 'INVALID_REQUEST');
  }
});

test('busy imports return 429 while health stays available; slot is released on failure', async t => {
  let unblock;
  let entered;
  const started = new Promise(resolve => { entered = resolve; });
  const blocked = new Promise(resolve => { unblock = resolve; });
  const api = await serve(t, { download: async () => { entered(); await blocked; throw new Error('failure'); }, upload: async () => {} });
  const first = api.post({ sourceUrl: 'https://example.com/a' });
  await started;
  try {
    assert.equal((await fetch(`${api.base}/healthz`)).status, 200);
    const busy = await api.post({ sourceUrl: 'https://example.com/b' });
    assert.equal(busy.status, 429);
    assert.equal(busy.headers.get('retry-after'), '2');
  } finally { unblock(); }
  assert.equal((await first).status, 500);
  assert.equal((await api.post({ sourceUrl: 'http://example.com/a' })).status, 400);
});

test('body and storage failures have stable errors without internal details', async t => {
  const api = await serve(t, { download: async () => Buffer.from('test'), normalize: async data => data, upload: async () => { throw new Error('secret'); } });
  const oversized = await api.post({ sourceUrl: 'x'.repeat(33_000) });
  assert.equal(oversized.status, 413);
  assert.equal((await oversized.json()).error.code, 'BODY_TOO_LARGE');
  // Spring이 허용하는 4,096자 URL은 비ASCII(3바이트)와 JSON 이스케이프(\u0001, 6바이트)여도 본문 한도에 걸리지 않는다.
  for (const filler of ['가', '\u0001']) {
    const sourceUrl = 'https://example.com/' + filler.repeat(4096 - 'https://example.com/'.length);
    const response = await api.post({ sourceUrl });
    assert.equal((await response.json()).error.code, 'STORAGE_UNAVAILABLE');
  }
  const invalid = await api.postRaw('{', signedHeaders('{'));
  assert.equal(invalid.status, 400);
  assert.equal((await invalid.json()).error.code, 'INVALID_JSON');
  const failed = await api.post({ sourceUrl: 'https://example.com/a' });
  assert.equal(failed.status, 502);
  const body = await failed.json();
  assert.equal(body.error.code, 'STORAGE_UNAVAILABLE');
  assert.ok(!JSON.stringify(body).includes('secret'));
});

test('configuration requires runtime settings and rejects unsafe delivery URLs', () => {
  assert.throws(() => loadConfig({}), /AWS_REGION/);
  const env = {
    AWS_REGION: 'ap-northeast-2', S3_BUCKET: 'bucket', S3_ROOT_DIRECTORY: '/rilog/', IMAGE_BASE_URL: 'https://cdn.example.com/',
    RILOG_IMAGE_SERVER_SECRET: SECRET,
  };
  assert.equal(loadConfig(env).imageBaseUrl, 'https://cdn.example.com');
  assert.equal(loadConfig(env).rootDirectory, 'rilog');
  assert.throws(() => loadConfig({ ...env, IMAGE_BASE_URL: 'http://cdn.example.com' }), /HTTPS/);
  for (const root of ['../originals', 'rilog/../x', 'rilog//x']) {
    assert.throws(() => loadConfig({ ...env, S3_ROOT_DIRECTORY: root }), /S3_ROOT_DIRECTORY/);
  }
  assert.throws(() => loadConfig({ ...env, RILOG_IMAGE_SERVER_SECRET: undefined }), /RILOG_IMAGE_SERVER_SECRET is required/);
  assert.throws(() => loadConfig({ ...env, RILOG_IMAGE_SERVER_SECRET: 'short' }), /at least 32/);
});

const IMAGE_ID = '7-0f8fad5b-d9cb-469f-a165-70867728950e';

test('compact targets map raw originals to purpose widths and reject other keys', () => {
  assert.deepEqual(resolveCompactTargets('rilog', `rilog/images/raw/${IMAGE_ID}/original.PNG`), [750, 1200, 1400, 2000].map(width => ({
    width, key: `rilog/images/compact/${IMAGE_ID}/${width}.webp`,
  })));
  assert.deepEqual(resolveCompactTargets('rilog', `rilog/profiles/raw/${IMAGE_ID}/original.jpg`).map(({ key }) => key), [
    `rilog/profiles/compact/${IMAGE_ID}/50.webp`, `rilog/profiles/compact/${IMAGE_ID}/360.webp`,
  ]);
  for (const key of [
    null, `other/images/raw/${IMAGE_ID}/original.png`, `rilog/files/raw/${IMAGE_ID}/original.png`, `rilog/images/compact/${IMAGE_ID}/750.webp`,
    `rilog/images/raw/${IMAGE_ID}/original.gif`, `rilog/images/raw/${IMAGE_ID}/original.svg`, `rilog/images/RAW/${IMAGE_ID}/original.png`,
    `rilog/images/raw/x-${IMAGE_ID}/original.png`, `rilog/images/raw/${IMAGE_ID}/../original.png`, `rilog/images/originals/${IMAGE_ID}.png`,
  ]) {
    assert.throws(() => resolveCompactTargets('rilog', key), { code: 'INVALID_OBJECT_KEY' });
  }
});

test('compaction keeps narrower originals at their width and corrects EXIF orientation', async () => {
  const source = await sharp({ create: { width: 1300, height: 20, channels: 3, background: 'red' } }).jpeg().toBuffer();
  const outputs = await compactImage(source, [750, 1200, 1400, 2000]);
  assert.deepEqual(outputs.map(({ width }) => width), [750, 1200, 1400, 2000]);
  const widths = await Promise.all(outputs.map(async ({ data }) => (await sharp(data).metadata()).width));
  assert.deepEqual(widths, [750, 1200, 1300, 1300]);
  assert.equal(outputs[2].data, outputs[3].data);
  assert.equal((await sharp(outputs[0].data).metadata()).format, 'webp');

  // Orientation 6(90도 회전): 저장된 픽셀은 40x10이지만 보이는 너비는 10이다.
  const rotated = await sharp({ create: { width: 40, height: 10, channels: 3, background: 'blue' } })
    .withMetadata({ orientation: 6 }).jpeg().toBuffer();
  const [profile] = await compactImage(rotated, [50]);
  const meta = await sharp(profile.data).metadata();
  assert.deepEqual([meta.width, meta.height, meta.orientation], [10, 40, undefined]);
});

test('compaction rejects animated and corrupt images', async () => {
  const frames = Buffer.from([255,0,0,255,0,0,255,0,0,255,0,0,0,0,255,0,0,255,0,0,255,0,0,255]);
  const animated = await sharp(frames, { raw: { width: 2, height: 4, channels: 3, pageHeight: 2 } }).webp({ loop: 0, delay: [100, 100] }).toBuffer();
  await assert.rejects(compactImage(animated, [750]), { code: 'UNSUPPORTED_IMAGE' });
  await assert.rejects(compactImage(Buffer.from('<html/>'), [750]), { code: 'INVALID_IMAGE' });
});

test('compact API writes every width of a signed raw key and reports the keys', async t => {
  const source = await sharp({ create: { width: 400, height: 300, channels: 3, background: 'green' } }).png().toBuffer();
  const stored = new Map();
  const api = await serve(t, {
    readOriginal: async key => { assert.equal(key, `rilog/profiles/raw/${IMAGE_ID}/original.png`); return source; },
    putCompact: async (key, data) => stored.set(key, data),
  });
  const response = await api.compact(`rilog/profiles/raw/${IMAGE_ID}/original.png`);
  assert.equal(response.status, 200);
  const keys = [`rilog/profiles/compact/${IMAGE_ID}/50.webp`, `rilog/profiles/compact/${IMAGE_ID}/360.webp`];
  assert.deepEqual((await response.json()).keys, keys);
  assert.deepEqual([...stored.keys()], keys);
  assert.equal((await sharp(stored.get(keys[1])).metadata()).width, 360);
});

test('compact API rejects other signatures and maps source, image and storage failures', async t => {
  const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: 'red' } }).png().toBuffer();
  let read = async () => png;
  let put = async () => {};
  const api = await serve(t, { readOriginal: (...args) => read(...args), putCompact: (...args) => put(...args) });
  const key = `rilog/images/raw/${IMAGE_ID}/original.jpg`;

  // 가져오기 경로로 만든 서명은 압축 경로에서 쓸 수 없다.
  const forged = await api.compact(key, { path: '/api/images/import' });
  assert.equal(forged.status, 401);
  assert.equal((await forged.json()).error.code, 'INVALID_SIGNATURE');

  const invalidKey = await api.compact(`rilog/images/raw/${IMAGE_ID}/original.gif`);
  assert.equal(invalidKey.status, 400);
  assert.equal((await invalidKey.json()).error.code, 'INVALID_OBJECT_KEY');

  const cases = [
    [async () => { throw Object.assign(new Error('missing'), { name: 'NoSuchKey' }); }, put, 404, 'SOURCE_NOT_FOUND'],
    [async () => { throw new Error('secret'); }, put, 502, 'STORAGE_UNAVAILABLE'],
    [async () => Buffer.from('broken'), put, 422, 'INVALID_IMAGE'],
    [async () => png, async () => { throw new Error('secret'); }, 502, 'STORAGE_UNAVAILABLE'],
  ];
  for (const [nextRead, nextPut, status, code] of cases) {
    read = nextRead;
    put = nextPut;
    const response = await api.compact(key);
    assert.equal(response.status, status);
    const body = await response.json();
    assert.equal(body.error.code, code);
    assert.ok(!JSON.stringify(body).includes('secret'));
  }
});

test('compact API logs the failed object key with status and code', async t => {
  const logs = [];
  t.mock.method(console, 'error', line => logs.push(JSON.parse(line)));
  const key = `rilog/images/raw/${IMAGE_ID}/original.png`;
  const api = await serve(t, {
    readOriginal: async () => Buffer.from('broken'),
    putCompact: async () => {},
  });

  assert.equal((await api.compact(key)).status, 422);
  assert.equal((await api.compact(`rilog/images/raw/${IMAGE_ID}/original.gif`)).status, 400);
  assert.equal((await api.compact(key, { secret: 'another-image-server-secret-at-least-32-chars' })).status, 401);

  const failures = logs.filter(({ event }) => event === 'image_compact_failed');
  assert.deepEqual(failures.map(({ key: failedKey, status, code }) => ({ key: failedKey, status, code })), [
    { key, status: 422, code: 'INVALID_IMAGE' },
    { key: `rilog/images/raw/${IMAGE_ID}/original.gif`, status: 400, code: 'INVALID_OBJECT_KEY' },
  ]);
});

test('compact API times out slow jobs and requests still waiting for them', async t => {
  const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: 'red' } }).png().toBuffer();
  let unblock;
  let entered;
  const started = new Promise(resolve => { entered = resolve; });
  const blocked = new Promise(resolve => { unblock = resolve; });
  let reads = 0;
  const api = await serve(t, {
    compactDeadlineMs: 200,
    readOriginal: async (key, signal) => {
      reads++;
      if (reads > 1) return png;
      entered();
      await blocked;
      signal.throwIfAborted();
      return png;
    },
    putCompact: async () => {},
  });
  const key = `rilog/profiles/raw/${IMAGE_ID}/original.png`;
  const first = api.compact(key);
  await started;
  // 앞 작업이 시한을 넘기는 동안 기다리던 요청은 원본을 읽지 않고 시한 초과로 끝난다.
  const waiting = await api.compact(key);
  assert.equal(waiting.status, 504);
  assert.equal((await waiting.json()).error.code, 'COMPACT_TIMEOUT');
  assert.equal(reads, 1);
  unblock();
  const slow = await first;
  assert.equal(slow.status, 504);
  assert.equal((await slow.json()).error.code, 'COMPACT_TIMEOUT');
  assert.equal((await api.compact(key)).status, 200);
});

test('compact queue runs jobs in order and rejects when the waiting list is full', async () => {
  const run = createCompactQueue({ maxWaiting: 1 });
  const signal = new AbortController().signal;
  const order = [];
  let release;
  const first = run(() => new Promise(resolve => { release = resolve; }).then(() => order.push(1)), signal);
  const second = run(async () => order.push(2), signal);
  assert.throws(() => run(async () => order.push(3), signal), { code: 'BUSY' });
  release();
  await Promise.all([first, second]);
  assert.deepEqual(order, [1, 2]);
  await run(async () => order.push(4), signal);
  assert.deepEqual(order, [1, 2, 4]);
});
