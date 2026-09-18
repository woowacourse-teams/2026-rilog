import { describe, expect, it } from 'vitest';

import { normalizeInlineCommentHighlightRects } from './inline-comment-highlight-rects';

const createRect = (left: number, top: number, width: number, height: number) => ({
	left,
	top,
	right: left + width,
	bottom: top + height,
	width,
	height,
});

describe('normalizeInlineCommentHighlightRects', () => {
	it('같은 줄의 일반 텍스트와 인라인 코드 rect를 같은 높이로 정렬하고 중복을 합친다', () => {
		const rootRects = [
			createRect(10, 30, 100, 19),
			createRect(110, 28, 160, 20.5),
			createRect(114, 32, 152, 16.5),
			createRect(270, 30, 50, 19),
		];
		const mixedAnchorRects = [
			createRect(40, 30, 70, 19),
			createRect(110, 28, 160, 20.5),
			createRect(114, 32, 152, 16.5),
			createRect(270, 30, 30, 19),
		];
		const codeOnlyAnchorRects = [createRect(114, 32, 152, 16.5)];

		expect(normalizeInlineCommentHighlightRects(mixedAnchorRects, rootRects)).toEqual([createRect(40, 30, 260, 19)]);
		expect(normalizeInlineCommentHighlightRects(codeOnlyAnchorRects, rootRects)).toEqual([
			createRect(114, 30, 152, 19),
		]);
	});

	it('서로 다른 시각적 줄의 rect는 합치지 않는다', () => {
		const rootRects = [createRect(10, 30, 100, 19), createRect(10, 56, 100, 19)];

		expect(normalizeInlineCommentHighlightRects(rootRects, rootRects)).toEqual(rootRects);
	});

	it('prototype getter를 사용하는 DOMRect 좌표도 보존한다', () => {
		const domRect = Object.create(null) as ReturnType<typeof createRect>;
		Object.defineProperties(domRect, {
			left: { get: () => 20 },
			top: { get: () => 30 },
			right: { get: () => 100 },
			bottom: { get: () => 49 },
			width: { get: () => 80 },
			height: { get: () => 19 },
		});

		expect(normalizeInlineCommentHighlightRects([domRect], [domRect])).toEqual([createRect(20, 30, 80, 19)]);
	});
});
