import { describe, expect, it } from 'vitest';

import type { Block } from '@blocknote/core';

import { InvalidPostMediaError, isTransientMediaUrl, validatePostMedia } from './validate-post-media';

const createMedia = (type: 'image' | 'file' | 'video' | 'audio', url: string): Block => {
	const common = {
		id: type,
		props: {
			url,
			backgroundColor: 'default',
			textAlignment: 'left' as const,
			name: '',
			caption: '',
			showPreview: true,
			previewWidth: 512,
		},
		content: undefined,
		children: [],
	};
	switch (type) {
		case 'image':
			return { ...common, type };
		case 'file':
			return { ...common, type };
		case 'video':
			return { ...common, type };
		case 'audio':
			return { ...common, type };
	}
};

describe('본문 미디어 URL 검증', () => {
	it.each([
		'data:image/heic;base64,private',
		'\u0001data:image/png;base64,private',
		'\u0000BLOB:id\u001f',
		'blob:https://rilog.test/id',
		' \tDaTa:image/png;base64,x \n',
		' BLOB:id ',
		'da\nta:image/png;base64,x',
	])('임시 URL %s를 검사하면 저장 불가로 판정한다', (url) => expect(isTransientMediaUrl(url)).toBe(true));

	it.each([
		'https://cdn.rilog.test/image.png',
		'http://example.com/file',
		'posts/image.png',
		'/images/default.svg',
		'',
		'https://example.com/data:image/png',
	])('정상 URL %s를 검사하면 기존 저장을 허용한다', (url) => expect(isTransientMediaUrl(url)).toBe(false));

	it.each(['image', 'file', 'video', 'audio'] as const)(
		'%s의 중첩 URL이 임시 주소이면 원문을 포함하지 않는 오류로 거부한다',
		(type) => {
			const secret = 'data:image/heic;base64,private-image';
			const parent: Block = {
				id: 'parent',
				type: 'paragraph',
				props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
				content: [],
				children: [createMedia(type, secret)],
			};
			expect(() => validatePostMedia([parent])).toThrow(InvalidPostMediaError);
			try {
				validatePostMedia([parent]);
			} catch (error) {
				expect(String(error)).not.toContain(secret);
			}
			expect(parent.children[0]).toEqual(createMedia(type, secret));
		},
	);

	it('일반 본문의 data 문자열과 정상 미디어는 변경 없이 허용한다', () => {
		const paragraph: Block = {
			id: 'text',
			type: 'paragraph',
			props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
			content: [{ type: 'text', text: '예시 data:image/png;base64,x 와 blob: 사용법', styles: {} }],
			children: [createMedia('image', 'https://cdn.rilog.test/image.png')],
		};
		expect(() => validatePostMedia([paragraph])).not.toThrow();
	});
});
