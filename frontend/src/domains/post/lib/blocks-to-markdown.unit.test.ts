import { describe, expect, it } from 'vitest';

import type { Block } from '@blocknote/core';

import { blocksToMarkdown } from './blocks-to-markdown';

describe('blocksToMarkdown', () => {
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
