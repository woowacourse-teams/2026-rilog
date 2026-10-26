import { afterEach, beforeEach, expect, it, vi } from 'vitest';

import {
	savePendingInlineCommentSelection,
	takePendingInlineCommentSelection,
} from './pending-inline-comment-selection';

const target = { blockId: 'block-1', startOffset: 0, endOffset: 4, selectedText: '인용 문' };

beforeEach(() => {
	const values = new Map<string, string>();
	vi.stubGlobal('sessionStorage', {
		getItem: (key: string) => values.get(key) ?? null,
		setItem: (key: string, value: string) => values.set(key, value),
		removeItem: (key: string) => values.delete(key),
	});
	vi.stubGlobal('window', { location: { pathname: '/@author/posts/1' } });
});

afterEach(() => vi.unstubAllGlobals());

it('플로팅 버튼에서 로그인한 뒤 선택과 진입점을 한 번만 복원한다', () => {
	savePendingInlineCommentSelection(1, target, 'floating_button');
	expect(takePendingInlineCommentSelection(1)).toEqual({ ...target, entrySource: 'floating_button' });
	expect(takePendingInlineCommentSelection(1)).toBeNull();
});

it('기존 툴바에서 저장한 선택은 이전 형식 그대로 복원한다', () => {
	savePendingInlineCommentSelection(1, target);
	expect(takePendingInlineCommentSelection(1)).toEqual(target);
});

it('다른 게시글에 돌아오면 저장한 선택을 적용하지 않는다', () => {
	savePendingInlineCommentSelection(1, target, 'floating_button');
	expect(takePendingInlineCommentSelection(2)).toBeNull();
});
