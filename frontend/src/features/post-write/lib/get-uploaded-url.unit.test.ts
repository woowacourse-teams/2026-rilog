import { describe, expect, it } from 'vitest';

import { getUploadedUrl } from './get-uploaded-url';

describe('getUploadedUrl', () => {
	it('문자열 또는 URL이 있는 업로드 결과를 받으면 URL을 반환한다', () => {
		expect(getUploadedUrl('https://example.com/image.png')).toBe('https://example.com/image.png');
		expect(getUploadedUrl({ props: { url: 'https://example.com/file.pdf' } })).toBe('https://example.com/file.pdf');
	});

	it('실패 결과나 빈 URL을 받으면 성공으로 처리하지 않는다', () => {
		expect(getUploadedUrl({})).toBeNull();
		expect(getUploadedUrl('')).toBeNull();
		expect(getUploadedUrl({ props: { url: '' } })).toBeNull();
		expect(getUploadedUrl({ props: { url: 1 } })).toBeNull();
	});
});
