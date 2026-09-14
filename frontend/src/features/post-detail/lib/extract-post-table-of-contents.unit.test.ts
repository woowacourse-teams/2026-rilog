import { describe, expect, it } from 'vitest';

import type { Block } from '@blocknote/core';

import { extractPostTableOfContents } from './extract-post-table-of-contents';

const DEFAULT_TEXT_PROPS = {
	backgroundColor: 'default',
	textAlignment: 'left',
	textColor: 'default',
} as const;

const heading = (id: string, value: string, level: 1 | 2 | 3, children: Block[] = [], isToggleable = false): Block => ({
	id,
	type: 'heading',
	props: { ...DEFAULT_TEXT_PROPS, level, isToggleable },
	content: [{ type: 'text', text: value, styles: {} }],
	children,
});

const toggle = (id: string, value: string, children: Block[]): Block => ({
	id,
	type: 'toggleListItem',
	props: DEFAULT_TEXT_PROPS,
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

	it('토글 내부 헤딩은 목차에서 제외한다', () => {
		const blocks = [
			heading('visible-heading', '보이는 제목', 1),
			toggle('toggle-list', '토글 목록', [heading('toggle-list-child', '토글 목록 속 제목', 2)]),
			heading('toggle-heading', '접을 수 있는 제목', 2, [heading('toggle-heading-child', '숨겨진 제목', 3)], true),
		];

		expect(extractPostTableOfContents(blocks)).toEqual([
			{ id: '보이는-제목', text: '보이는 제목', level: 1 },
			{ id: '접을-수-있는-제목', text: '접을 수 있는 제목', level: 2 },
		]);
	});
});
