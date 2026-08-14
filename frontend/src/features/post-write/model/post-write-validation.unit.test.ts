import { describe, expect, it } from 'vitest';

import type { Block } from '@blocknote/core';

import { isMeaningfulPostBody, validatePostDocument } from './post-write-validation';

interface TestBlockInput {
	type?: string;
	props?: Record<string, unknown>;
	content?: unknown;
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

describe('isMeaningfulPostBody', () => {
	it('빈 paragraph만 있으면 유효하지 않다', () => {
		expect(isMeaningfulPostBody([createBlock({ content: [] })])).toBe(false);
	});

	it('공백이 아닌 text가 중첩 block에 있으면 유효하다', () => {
		const nestedBlock = createBlock({
			children: [
				createBlock({
					content: [{ type: 'text', text: '기록할 내용', styles: {} }],
				}),
			],
		});

		expect(isMeaningfulPostBody([nestedBlock])).toBe(true);
	});

	it('URL이 있는 이미지 block은 유효하다', () => {
		const imageBlock = createBlock({ type: 'image', props: { url: 'https://example.com/image.png' } });

		expect(isMeaningfulPostBody([imageBlock])).toBe(true);
	});

	it('텍스트가 입력된 table cell은 유효하다', () => {
		const tableBlock = createBlock({
			type: 'table',
			content: {
				type: 'tableContent',
				rows: [
					{
						cells: [{ content: [{ type: 'text', text: '표 안의 기록', styles: {} }] }],
					},
				],
			},
		});

		expect(isMeaningfulPostBody([tableBlock])).toBe(true);
	});
});

describe('validatePostDocument', () => {
	it('공백 제목과 빈 본문의 오류를 함께 반환한다', () => {
		expect(validatePostDocument('  ', [createBlock({})])).toEqual({
			title: '제목을 입력해 주세요.',
			body: '내용을 입력해 주세요.',
		});
	});

	it('제목과 본문이 유효하면 오류가 없다', () => {
		expect(
			validatePostDocument('회고', [createBlock({ content: [{ type: 'text', text: '오늘 배운 점', styles: {} }] })]),
		).toEqual({});
	});

	it('API 제한을 넘는 제목을 거부한다', () => {
		expect(
			validatePostDocument('a'.repeat(513), [createBlock({ content: [{ type: 'text', text: '본문', styles: {} }] })]),
		).toEqual({ title: '제목은 512자 이하로 입력해 주세요.' });
	});

	it('앞뒤 공백을 제외한 제목 길이가 512자이면 허용한다', () => {
		expect(
			validatePostDocument(`  ${'a'.repeat(512)}  `, [
				createBlock({ content: [{ type: 'text', text: '본문', styles: {} }] }),
			]),
		).toEqual({});
	});
});
