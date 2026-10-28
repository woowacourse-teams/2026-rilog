import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { appendImageSizeHash } from './append-image-size-hash';

describe('appendImageSizeHash', () => {
	beforeEach(() => vi.stubEnv('NEXT_PUBLIC_S3_BUCKET_URL', 'https://rilog-bucket.s3.ap-northeast-2.amazonaws.com'));
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.unstubAllEnvs();
	});

	it('업로드한 이미지의 크기를 URL 해시에 기록한다', async () => {
		const close = vi.fn();
		vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 1200, height: 800, close }));

		const url = await appendImageSizeHash(new File(['image'], 'cover.png', { type: 'image/png' }), 'posts/cover.png');

		expect(url).toBe('https://rilog-bucket.s3.ap-northeast-2.amazonaws.com/posts/cover.png#1200x800');
		expect(close).toHaveBeenCalledOnce();
	});

	it('이미지를 읽을 수 없으면 기존 URL로 발행을 계속한다', async () => {
		vi.stubGlobal('createImageBitmap', vi.fn().mockRejectedValue(new Error('decode failed')));

		const url = await appendImageSizeHash(new File(['broken'], 'cover.png', { type: 'image/png' }), 'posts/cover.png');

		expect(url).toBe('posts/cover.png');
	});

	it('크기 해시가 게시글 API의 URL 길이 제한을 넘기면 기존 URL을 사용한다', async () => {
		vi.stubGlobal('createImageBitmap', vi.fn().mockResolvedValue({ width: 1200, height: 800, close: vi.fn() }));
		const url = `posts/${'a'.repeat(500)}`;

		expect(await appendImageSizeHash(new File(['image'], 'cover.png', { type: 'image/png' }), url)).toBe(url);
	});

	it('이미지가 아닌 파일과 이미 해시가 있는 URL은 변경하지 않는다', async () => {
		const decode = vi.fn();
		vi.stubGlobal('createImageBitmap', decode);

		expect(
			await appendImageSizeHash(new File(['file'], 'note.pdf', { type: 'application/pdf' }), 'files/note.pdf'),
		).toBe('files/note.pdf');
		expect(
			await appendImageSizeHash(new File(['image'], 'cover.png', { type: 'image/png' }), 'posts/cover.png#100x100'),
		).toBe('posts/cover.png#100x100');
		expect(decode).not.toHaveBeenCalled();
	});

	it('S3 주소가 설정되지 않거나 다른 호스트면 원본 객체 키를 유지한다', async () => {
		const decode = vi.fn();
		vi.stubGlobal('createImageBitmap', decode);
		vi.stubEnv('NEXT_PUBLIC_S3_BUCKET_URL', 'https://cdn.rilog.test');
		expect(await appendImageSizeHash(new File(['image'], 'cover.png', { type: 'image/png' }), 'posts/cover.png')).toBe(
			'posts/cover.png',
		);
		vi.stubEnv('NEXT_PUBLIC_S3_BUCKET_URL', '');
		expect(await appendImageSizeHash(new File(['image'], 'cover.png', { type: 'image/png' }), 'posts/cover.png')).toBe(
			'posts/cover.png',
		);
		expect(decode).not.toHaveBeenCalled();
	});
});
