import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST_THUMBNAIL_FALLBACK_URL, resolvePostThumbnailUrl } from './post-thumbnail';

describe('resolvePostThumbnailUrl', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('API object key를 이미지 URL로 해석한다', () => {
		vi.stubEnv('NEXT_PUBLIC_S3_BUCKET_URL', 'https://images.rilog.test');

		expect(resolvePostThumbnailUrl('rilog/images/post.png')).toBe('https://images.rilog.test/rilog/images/post.png');
	});

	it('썸네일이 없거나 잘못된 key면 공통 기본 이미지를 반환한다', () => {
		expect(resolvePostThumbnailUrl(null)).toBe('/images/thumbnail-fallback.svg');
		expect(resolvePostThumbnailUrl('null/images/post.png')).toBe('/images/thumbnail-fallback.svg');
	});
});
