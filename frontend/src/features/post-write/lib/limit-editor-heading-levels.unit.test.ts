import { describe, expect, it } from 'vitest';

import type { Block } from '@blocknote/core';

import { limitEditorHeadingLevels } from './limit-editor-heading-levels';

const heading = (id: string, level: 1 | 2 | 3 | 4 | 5 | 6, children: Block[] = []): Block => ({
	id,
	type: 'heading',
	props: { level, backgroundColor: 'default', textAlignment: 'left', textColor: 'default', isToggleable: false },
	content: [{ type: 'text', text: id, styles: {} }],
	children,
});

describe('limitEditorHeadingLevels', () => {
	it('기존 H5·H6와 중첩 헤딩을 편집할 때 H4로 낮추고 원본은 유지한다', () => {
		const original = [heading('h5', 5, [heading('h6', 6)]), heading('h3', 3)];
		const editable = limitEditorHeadingLevels(original);

		expect(editable[0]).toMatchObject({ props: { level: 4 }, children: [{ props: { level: 4 } }] });
		expect(editable[1]).toBe(original[1]);
		expect(original[0]).toMatchObject({ props: { level: 5 }, children: [{ props: { level: 6 } }] });
	});
});
