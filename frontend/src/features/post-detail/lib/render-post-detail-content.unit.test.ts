import { describe, expect, it } from 'vitest';

import type { Block } from '@blocknote/core';

import { renderPostDetailContent } from './render-post-detail-content';

const IMAGE_BLOCK: Block = {
	id: 'image-block',
	type: 'image',
	props: {
		backgroundColor: 'default',
		caption: '',
		name: '',
		previewWidth: 512,
		showPreview: true,
		textAlignment: 'left',
		url: 'https://images.rilog.test/post.png',
	},
	content: undefined,
	children: [],
};

const DEFAULT_TEXT_PROPS = {
	backgroundColor: 'default',
	textAlignment: 'left',
	textColor: 'default',
} as const;

const text = (value: string) => [{ type: 'text' as const, text: value, styles: {} }];

const TOGGLE_BLOCKS: Block[] = [
	{
		id: 'toggle-heading',
		type: 'heading',
		props: { ...DEFAULT_TEXT_PROPS, level: 2, isToggleable: true },
		content: text('토글 제목'),
		children: [
			{
				id: 'nested-toggle',
				type: 'toggleListItem',
				props: DEFAULT_TEXT_PROPS,
				content: text('중첩 토글'),
				children: [
					{
						id: 'nested-content',
						type: 'paragraph',
						props: DEFAULT_TEXT_PROPS,
						content: text('중첩 내용'),
						children: [],
					},
				],
			},
		],
	},
];

describe('renderPostDetailContent', () => {
	it('이미지 블록을 정적 HTML 이미지로 변환한다', async () => {
		const html = await renderPostDetailContent([IMAGE_BLOCK]);

		expect(html).toContain('<img');
		expect(html).toContain('src="https://images.rilog.test/post.png"');
	});

	it('토글 블록을 접힌 접근 가능한 마크업으로 변환한다', async () => {
		const blocks = structuredClone(TOGGLE_BLOCKS);
		const html = await renderPostDetailContent(blocks);

		expect(html.match(/class="bn-toggle-wrapper" data-show-children="false"/g)).toHaveLength(2);
		expect(html.match(/data-post-detail-toggle=""/g)).toHaveLength(2);
		expect(html.match(/aria-expanded="false"/g)).toHaveLength(2);
		expect(html).toContain('aria-controls="post-detail-toggle-content-0"');
		expect(html).toContain('aria-controls="post-detail-toggle-content-1"');
		expect(blocks).toEqual(TOGGLE_BLOCKS);
	});
});
