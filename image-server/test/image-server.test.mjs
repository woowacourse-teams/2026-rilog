import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { EventEmitter } from 'node:events';
import sharp from 'sharp';
import { createApp } from '../src/app.mjs';
import { createPublicLookup, downloadImage, validateUrl } from '../src/download.mjs';
import { normalizeImage } from '../src/image.mjs';
import { loadConfig } from '../src/config.mjs';

const config = { prefix: 'images/imported', imageBaseUrl: 'https://cdn.example.com' };

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
  const server = createApp({ config, ...dependencies }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    post: (body) => fetch(`${base}/api/images/import`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
  };
}

test('import creates independent keys and returns the delivery origin', async t => {
  const stored = [];
  const png = await sharp({ create: { width: 1, height: 1, channels: 3, background: 'red' } }).png().toBuffer();
  const api = await serve(t, { download: async () => png, upload: async (key, data) => stored.push({ key, data }) });
  for (let i = 0; i < 2; i++) {
    const response = await api.post({ sourceUrl: 'https://example.com/a.png' });
    assert.equal(response.status, 201);
    const body = await response.json();
    assert.equal(body.url, `${config.imageBaseUrl}/${body.key}`);
    assert.match(body.key, /^images\/imported\/[\da-f-]+\.webp$/);
  }
  assert.notEqual(stored[0].key, stored[1].key);
  assert.equal((await sharp(stored[0].data).metadata()).format, 'webp');
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
  assert.equal((await api.post({ sourceUrl: 'x'.repeat(9000) })).status, 413);
  const invalid = await fetch(`${api.base}/api/images/import`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
  assert.equal(invalid.status, 400);
  const failed = await api.post({ sourceUrl: 'https://example.com/a' });
  assert.equal(failed.status, 502);
  const body = await failed.json();
  assert.equal(body.error.code, 'STORAGE_UNAVAILABLE');
  assert.ok(!JSON.stringify(body).includes('secret'));
});

test('configuration requires runtime settings and rejects unsafe delivery URLs', () => {
  assert.throws(() => loadConfig({}), /AWS_REGION/);
  const env = { AWS_REGION: 'ap-northeast-2', S3_BUCKET: 'bucket', IMAGE_BASE_URL: 'https://cdn.example.com/' };
  assert.equal(loadConfig(env).imageBaseUrl, 'https://cdn.example.com');
  assert.throws(() => loadConfig({ ...env, IMAGE_BASE_URL: 'http://cdn.example.com' }), /HTTPS/);
  assert.throws(() => loadConfig({ ...env, S3_KEY_PREFIX: '../originals' }), /S3_KEY_PREFIX/);
});
