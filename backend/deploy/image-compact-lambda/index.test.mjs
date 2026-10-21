import assert from 'node:assert/strict';
import { afterEach, before, beforeEach, describe, it, mock } from 'node:test';
import sharp from 'sharp';
import { handleEvent } from './index.mjs';

const KEY = 'rilog/images/raw/1-0f8b6c2e-1a2b-4c3d-8e9f-0123456789ab/original.jpg';
const WIDTHS = [750, 1200, 1400, 2000];
const CONFIG = { apiBaseUrl: 'https://api.rilog.test', secret: 'x'.repeat(32) };
const UPLOAD_URLS_ENDPOINT = `${CONFIG.apiBaseUrl}/internal/v1/image-compactions/upload-urls`;
const EVENT = { Records: [{ s3: { bucket: { name: 'bucket' }, object: { key: KEY } } }] };

// presigned URL 업로드를 흉내 낸다. If-None-Match: * 조건처럼 이미 있는 압축본에는 412를 돌려준다.
function fakeCompactStorage() {
  const objects = new Map();
  const failOnce = new Map();

  const fetch = async (url, init) => {
    if (url === UPLOAD_URLS_ENDPOINT) {
      const uploads = WIDTHS.map((width) => ({
        width,
        uploadUrl: `https://s3.rilog.test/compact/${width}.webp`,
        headers: { 'Content-Type': 'image/webp', 'If-None-Match': '*' },
      }));
      return { ok: true, status: 200, json: async () => ({ data: { uploads } }) };
    }

    const width = Number(/\/(\d+)\.webp$/.exec(url)[1]);
    if (failOnce.has(width)) {
      const status = failOnce.get(width);
      failOnce.delete(width);
      return { ok: false, status };
    }
    if (objects.has(width)) {
      return { ok: false, status: 412 };
    }
    objects.set(width, init.body);
    return { ok: true, status: 200 };
  };

  return { objects, failOnce, fetch };
}

describe('압축본 업로드 재시도', () => {
  let original;

  before(async () => {
    original = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#3a7' } })
      .jpeg()
      .toBuffer();
  });

  beforeEach(() => {
    mock.method(console, 'log', () => {});
  });

  afterEach(() => {
    mock.restoreAll();
  });

  const s3 = () => ({
    send: async () => ({ Body: { transformToByteArray: async () => new Uint8Array(original) } }),
  });

  const run = (storage) => handleEvent(EVENT, s3(), { config: CONFIG, fetch: storage.fetch });

  it('일부 너비 업로드가 실패하면 예외를 던져 Lambda 재시도로 넘긴다', async () => {
    const storage = fakeCompactStorage();
    storage.failOnce.set(1400, 500);

    await assert.rejects(run(storage), /HTTP 500 \(width 1400\)/);
  });

  it('재시도에서는 이미 올라간 너비의 412를 성공으로 보고 남은 너비만 올린다', async () => {
    const storage = fakeCompactStorage();
    storage.objects.set(750, 'uploaded-before-retry');
    storage.objects.set(1200, 'uploaded-before-retry');

    await run(storage);

    assert.deepEqual([...storage.objects.keys()].sort((a, b) => a - b), WIDTHS);
    assert.equal(storage.objects.get(750), 'uploaded-before-retry');
    assert.equal(storage.objects.get(1200), 'uploaded-before-retry');
  });

  it('부분 실패 뒤 같은 이벤트로 재시도하면 모든 너비의 압축본이 남는다', async () => {
    const storage = fakeCompactStorage();
    storage.failOnce.set(1400, 500);

    await assert.rejects(run(storage));
    await run(storage);

    assert.deepEqual([...storage.objects.keys()].sort((a, b) => a - b), WIDTHS);
  });

  it('412가 아닌 4xx는 이미 있는 압축본으로 보지 않고 실패로 처리한다', async () => {
    const storage = fakeCompactStorage();
    storage.failOnce.set(1200, 403);

    await assert.rejects(run(storage), /HTTP 403 \(width 1200\)/);
  });
});
