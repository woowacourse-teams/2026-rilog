import { describe, expect, it } from 'vitest';

import type { Block } from '@blocknote/core';

import { findFirstBodyImageUrl, resolveRepresentativeImagePreview } from './resolve-representative-image';

interface TestBlockInput {
	type?: string;
	props?: Record<string, unknown>;
	content?: unknown[];
	children?: Block[];
}

const createBlock = (block: TestBlockInput): Block =>
	({
		id: 'block-id',
		type: 'paragraph',
		props: {},
		content: [],
		children: [],
		...block,
	}) as unknown as Block;

describe('findFirstBodyImageUrl', () => {
	it('문서 순서상 첫 번째 유효한 중첩 이미지 URL을 찾는다', () => {
		const blocks = [
			createBlock({ type: 'image', props: { url: ' ' } }),
			createBlock({
				children: [createBlock({ type: 'image', props: { url: 'https://example.com/first.png' } })],
			}),
			createBlock({ type: 'image', props: { url: 'https://example.com/second.png' } }),
		];

		expect(findFirstBodyImageUrl(blocks)).toBe('https://example.com/first.png');
	});
});

describe('resolveRepresentativeImagePreview', () => {
	const bodyBlocks = [createBlock({ type: 'image', props: { url: 'https://example.com/body.png' } })];

	it('사용자가 선택한 이미지가 본문 이미지보다 우선한다', () => {
		expect(resolveRepresentativeImagePreview('blob:selected', bodyBlocks, '/default.png')).toBe('blob:selected');
	});

	it('선택 이미지가 없으면 본문 첫 이미지를 사용한다', () => {
		expect(resolveRepresentativeImagePreview(null, bodyBlocks, '/default.png')).toBe('https://example.com/body.png');
	});

	it('선택 이미지와 본문 이미지가 없으면 기본 이미지를 사용한다', () => {
		expect(resolveRepresentativeImagePreview(null, [createBlock({})], '/default.png')).toBe('/default.png');
	});
});
