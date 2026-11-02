import { describe, expect, it } from 'vitest';

import { getImageKind, toCompactUrl, toSrcSet } from './image';

describe('image utils', () => {
	describe('toCompactUrl', () => {
		it('신경로 images URL을 지정된 크기의 compact webp URL로 변환한다', () => {
			const rawUrl = 'https://cdn.rilog.test/images/raw/uuid-123/original.png';
			const compactUrl = toCompactUrl(rawUrl, 750);

			expect(compactUrl).toBe('https://cdn.rilog.test/images/compact/uuid-123/750.webp');
		});

		it('신경로 profiles URL을 지정된 크기의 compact webp URL로 변환한다', () => {
			const rawUrl = 'https://cdn.rilog.test/profiles/raw/user-456/original.jpeg';
			const compactUrl = toCompactUrl(rawUrl, 50);

			expect(compactUrl).toBe('https://cdn.rilog.test/profiles/compact/user-456/50.webp');
		});

		it('경로에 prefix가 있는 URL도 올바르게 변환한다', () => {
			const rawUrl = 'https://cdn.rilog.test/sub-path/images/raw/uuid-123/original.png';
			const compactUrl = toCompactUrl(rawUrl, 1200);

			expect(compactUrl).toBe('https://cdn.rilog.test/sub-path/images/compact/uuid-123/1200.webp');
		});

		it('URL의 쿼리 스트링과 해시(치수 정보)를 그대로 보존한다', () => {
			const rawUrl = 'https://cdn.rilog.test/images/raw/uuid-123/original.png?v=1#w=1200&h=800';
			const compactUrl = toCompactUrl(rawUrl, 1400);

			expect(compactUrl).toBe('https://cdn.rilog.test/images/compact/uuid-123/1400.webp?v=1#w=1200&h=800');
		});

		it('압축 대상 확장자(대소문자 포함)를 compact URL로 변환한다', () => {
			const extensions = ['jpg', 'JPG', 'jpeg', 'png', 'webp', 'avif', 'AVIF'];
			extensions.forEach((ext) => {
				const rawUrl = `https://cdn.rilog.test/images/raw/uuid-123/original.${ext}`;
				expect(toCompactUrl(rawUrl, 750)).toBe('https://cdn.rilog.test/images/compact/uuid-123/750.webp');
			});
		});

		it('압축 대상이 아닌 GIF는 원본 URL을 반환한다', () => {
			const rawUrl = 'https://cdn.rilog.test/images/raw/uuid-123/original.gif';
			expect(toCompactUrl(rawUrl, 750)).toBe(rawUrl);
		});

		it('구경로(originals/{id}.png)는 변환하지 않고 원본을 반환한다', () => {
			const legacyUrl = 'https://cdn.rilog.test/originals/legacy-image-123.png';
			expect(toCompactUrl(legacyUrl, 750)).toBe(legacyUrl);
		});

		it('외부 도메인 이미지 URL은 변환하지 않고 원본을 반환한다', () => {
			const externalUrl = 'https://images.unsplash.com/photo-123.jpg';
			expect(toCompactUrl(externalUrl, 750)).toBe(externalUrl);
		});

		it('잘못된 URL 형식이나 상대 경로는 원본을 그대로 반환한다', () => {
			expect(toCompactUrl('not-a-valid-url', 750)).toBe('not-a-valid-url');
			expect(toCompactUrl('/images/raw/uuid-123/original.png', 750)).toBe('/images/raw/uuid-123/original.png');
			expect(toCompactUrl('', 750)).toBe('');
		});
	});

	describe('getImageKind', () => {
		it('신경로 images URL은 images kind를 반환한다', () => {
			expect(getImageKind('https://cdn.rilog.test/images/raw/uuid/original.png')).toBe('images');
		});

		it('신경로 profiles URL은 profiles kind를 반환한다', () => {
			expect(getImageKind('https://cdn.rilog.test/profiles/raw/user/original.png')).toBe('profiles');
		});

		it('구경로나 외부 URL은 null을 반환한다', () => {
			expect(getImageKind('https://cdn.rilog.test/originals/legacy.png')).toBeNull();
			expect(getImageKind('https://example.com/photo.jpg')).toBeNull();
			expect(getImageKind('invalid-url')).toBeNull();
		});

		it('GIF 원본 URL은 압축 이미지 종류로 분류하지 않는다', () => {
			expect(getImageKind('https://cdn.rilog.test/images/raw/uuid/original.gif')).toBeNull();
		});
	});

	describe('toSrcSet', () => {
		it('신경로 images URL을 750w, 1200w, 1400w, 2000w srcset 문자열로 변환한다', () => {
			const rawUrl = 'https://cdn.rilog.test/images/raw/uuid-123/original.png';
			const srcset = toSrcSet(rawUrl);

			expect(srcset).toBe(
				'https://cdn.rilog.test/images/compact/uuid-123/750.webp 750w, ' +
					'https://cdn.rilog.test/images/compact/uuid-123/1200.webp 1200w, ' +
					'https://cdn.rilog.test/images/compact/uuid-123/1400.webp 1400w, ' +
					'https://cdn.rilog.test/images/compact/uuid-123/2000.webp 2000w',
			);
		});

		it('신경로 profiles URL을 50w, 360w srcset 문자열로 변환한다', () => {
			const rawUrl = 'https://cdn.rilog.test/profiles/raw/user-456/original.png';
			const srcset = toSrcSet(rawUrl);

			expect(srcset).toBe(
				'https://cdn.rilog.test/profiles/compact/user-456/50.webp 50w, ' +
					'https://cdn.rilog.test/profiles/compact/user-456/360.webp 360w',
			);
		});

		it('해시가 포함된 이미지의 해시를 srcset 각 항목에 보존한다', () => {
			const rawUrl = 'https://cdn.rilog.test/images/raw/uuid-123/original.png#w=1200&h=800';
			const srcset = toSrcSet(rawUrl);

			expect(srcset).toBe(
				'https://cdn.rilog.test/images/compact/uuid-123/750.webp#w=1200&h=800 750w, ' +
					'https://cdn.rilog.test/images/compact/uuid-123/1200.webp#w=1200&h=800 1200w, ' +
					'https://cdn.rilog.test/images/compact/uuid-123/1400.webp#w=1200&h=800 1400w, ' +
					'https://cdn.rilog.test/images/compact/uuid-123/2000.webp#w=1200&h=800 2000w',
			);
		});

		it('구경로 이미지는 undefined를 반환한다', () => {
			const legacyUrl = 'https://cdn.rilog.test/originals/legacy-image-123.png';
			expect(toSrcSet(legacyUrl)).toBeUndefined();
		});

		it('외부 URL 이미지는 undefined를 반환한다', () => {
			const externalUrl = 'https://images.unsplash.com/photo-123.jpg';
			expect(toSrcSet(externalUrl)).toBeUndefined();
		});

		it('GIF 원본 URL은 srcset을 만들지 않는다', () => {
			expect(toSrcSet('https://cdn.rilog.test/images/raw/uuid/original.gif')).toBeUndefined();
		});

		it('잘못된 URL 형식은 undefined를 반환한다', () => {
			expect(toSrcSet('invalid-url')).toBeUndefined();
			expect(toSrcSet('')).toBeUndefined();
		});
	});
});
