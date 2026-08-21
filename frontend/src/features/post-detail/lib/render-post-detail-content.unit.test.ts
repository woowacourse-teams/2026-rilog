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

describe('renderPostDetailContent', () => {
	it('이미지 블록을 정적 HTML 이미지로 변환한다', async () => {
		const html = await renderPostDetailContent([IMAGE_BLOCK]);

		expect(html).toContain('<img');
		expect(html).toContain('src="https://images.rilog.test/post.png"');
	});
});
