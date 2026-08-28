import { afterEach, describe, expect, it, vi } from 'vitest';

import { getImageUrl } from './get-image-url';

describe('getImageUrl', () => {
	afterEach(() => {
		vi.unstubAllEnvs();
	});

	it('S3 object key를 버킷 URL과 결합한다', () => {
		vi.stubEnv('NEXT_PUBLIC_S3_BUCKET_URL', 'https://bucket.rilog.test/');

		expect(getImageUrl('rilog/images/cover.png')).toBe('https://bucket.rilog.test/rilog/images/cover.png');
	});

	it('잘못된 null object key는 빈 URL로 처리한다', () => {
		expect(getImageUrl('null/images/cover.png')).toBe('');
	});
});
