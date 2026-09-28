import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useInlineCommentDraft } from './use-inline-comment-draft';

describe('useInlineCommentDraft', () => {
	beforeEach(() => sessionStorage.clear());
	afterEach(() => vi.restoreAllMocks());

	it('스레드가 다시 마운트되어도 줄바꿈과 공백을 포함한 초안을 복원한다', () => {
		const first = renderHook(() => useInlineCommentDraft(1));
		act(() => first.result.current.onCommentChange(' 첫 줄\n둘째 줄 '));
		first.unmount();

		const restored = renderHook(() => useInlineCommentDraft(1));
		expect(restored.result.current.commentText).toBe(' 첫 줄\n둘째 줄 ');
	});

	it('앵커를 전환해도 서로의 초안을 덮어쓰지 않는다', () => {
		const { result, rerender } = renderHook(({ anchorId }) => useInlineCommentDraft(anchorId), {
			initialProps: { anchorId: 1 },
		});
		act(() => result.current.onCommentChange('첫 초안'));
		rerender({ anchorId: 2 });
		expect(result.current.commentText).toBe('');
		act(() => result.current.onCommentChange('다른 초안'));
		rerender({ anchorId: 1 });
		expect(result.current.commentText).toBe('첫 초안');
		rerender({ anchorId: 2 });
		expect(result.current.commentText).toBe('다른 초안');
	});

	it('내용을 모두 지우면 저장된 초안도 삭제한다', () => {
		const first = renderHook(() => useInlineCommentDraft(1));
		act(() => first.result.current.onCommentChange('초안'));
		act(() => first.result.current.onCommentChange(''));
		first.unmount();

		expect(sessionStorage.length).toBe(0);
		const restored = renderHook(() => useInlineCommentDraft(1));
		expect(restored.result.current.commentText).toBe('');
	});

	it('이미 저장된 초안을 초기 빈 값으로 덮어쓰지 않는다', () => {
		sessionStorage.setItem('rilog:inline-comment-draft:1', '기존 초안');
		const { result } = renderHook(() => useInlineCommentDraft(1));
		expect(result.current.commentText).toBe('기존 초안');
		expect(sessionStorage.getItem('rilog:inline-comment-draft:1')).toBe('기존 초안');
	});

	it('저장소에 접근할 수 없어도 현재 입력은 유지한다', () => {
		vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
			throw new DOMException('Storage blocked', 'SecurityError');
		});
		const { result } = renderHook(() => useInlineCommentDraft(1));
		act(() => result.current.onCommentChange('작성 중'));
		expect(result.current.commentText).toBe('작성 중');
	});
});
