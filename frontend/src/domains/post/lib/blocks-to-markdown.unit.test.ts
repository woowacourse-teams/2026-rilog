import { describe, expect, it } from 'vitest';

import type { Block } from '@blocknote/core';

import type { PostContentBlock } from '@/domains/post/model/post-content';

import { blocksToMarkdown } from './blocks-to-markdown';

describe('blocksToMarkdown', () => {
	it('이미지 열에 담긴 두 이미지 URL을 Markdown에 포함한다', async () => {
		const image = (id: string): PostContentBlock => ({
			id,
			type: 'image',
			props: {
				backgroundColor: 'default',
				textAlignment: 'left',
				name: id,
				url: `https://example.com/${id}.png`,
				caption: '',
				showPreview: true,
				previewWidth: 512,
			},
			content: undefined,
			children: [],
		});
		const blocks: PostContentBlock[] = [
			{
				id: 'row',
				type: 'columnList',
				props: {},
				content: undefined,
				children: [
					{ id: 'first-column', type: 'column', props: { width: 1 }, content: undefined, children: [image('first')] },
					{ id: 'second-column', type: 'column', props: { width: 1 }, content: undefined, children: [image('second')] },
				],
			},
		];

		const markdown = await blocksToMarkdown(blocks);

		expect(markdown).toContain('https://example.com/first.png');
		expect(markdown).toContain('https://example.com/second.png');
	});

	it('빈 업로드 블록은 제외하고 그 아래의 본문은 Markdown에 포함한다', async () => {
		const blocks: Block[] = [
			{
				id: 'pending-image',
				type: 'image',
				props: {
					backgroundColor: 'default',
					textAlignment: 'left',
					name: '임시 이미지',
					url: '',
					caption: '',
					showPreview: true,
					previewWidth: 512,
				},
				content: undefined,
				children: [
					{
						id: 'child',
						type: 'paragraph',
						props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
						content: [{ type: 'text', text: '중첩 본문', styles: {} }],
						children: [],
					},
				],
			},
		];

		const markdown = await blocksToMarkdown(blocks);

		expect(markdown).toContain('중첩 본문');
		expect(markdown).not.toContain('임시 이미지');
	});

	it('표의 셀 내용을 Markdown에 포함한다', async () => {
		const blocks = [
			{
				id: 'table-1',
				type: 'table',
				props: {},
				content: {
					type: 'tableContent',
					rows: [{ cells: [[{ type: 'text', text: '이름', styles: {} }], [{ type: 'text', text: '값', styles: {} }]] }],
				},
				children: [],
			},
		] as unknown as Block[];

		const markdown = await blocksToMarkdown(blocks);

		expect(markdown).toContain('이름');
		expect(markdown).toContain('값');
		expect(markdown).toContain('|');
	});
});
