import { describe, expect, it } from 'vitest';

import type { Block } from '@blocknote/core';

import { extractPostTableOfContents } from './extract-post-table-of-contents';

const DEFAULT_TEXT_PROPS = {
	backgroundColor: 'default',
	textAlignment: 'left',
	textColor: 'default',
} as const;

const heading = (id: string, value: string, level: 1 | 2 | 3, children: Block[] = []): Block => ({
	id,
	type: 'heading',
	props: { ...DEFAULT_TEXT_PROPS, level, isToggleable: false },
	content: [{ type: 'text', text: value, styles: {} }],
	children,
});

describe('extractPostTableOfContents', () => {
	it('헤딩 이름을 anchor로 사용하고 중복 이름에는 짧은 식별자를 붙인다', () => {
		const blocks = [
			heading('first-block', ' 문제 상황 ', 1),
			heading('second-block', '문제 상황', 2, [heading('nested-block', '해결 방법 & 결과', 3)]),
			heading('third-block', '문제 상황 2', 1),
		];

		const items = extractPostTableOfContents(blocks);

		expect(items[0]).toEqual({ id: '문제-상황', text: '문제 상황', level: 1 });
		expect(items[1]).toMatchObject({ text: '문제 상황', level: 2 });
		expect(items[1]?.id).toMatch(/^문제-상황-[a-z0-9]{7}$/);
		expect(items[2]).toEqual({ id: '해결-방법-&-결과', text: '해결 방법 & 결과', level: 3 });
		expect(items[3]).toEqual({ id: '문제-상황-2', text: '문제 상황 2', level: 1 });
		expect(items.every(({ id }) => !id.includes('--'))).toBe(true);
		expect(extractPostTableOfContents(blocks)).toEqual(items);
	});
});
