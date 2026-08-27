import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DraftPostItem } from '../model/post-draft';

import { usePostDrafts } from './use-post-drafts';

const INITIAL_POSTS: readonly DraftPostItem[] = [
	{ id: 1, title: '첫 번째 글', savedAt: '2026-08-21T04:40:07.585624' },
	{ id: 2, title: '두 번째 글', savedAt: '2026-08-20T04:40:07.585624' },
];

describe('usePostDrafts', () => {
	it('문서 준비가 성공할 때와 실패할 때 모두 최신 문서를 준비한다', () => {
		const prepareDocument = vi.fn().mockReturnValueOnce(null).mockReturnValueOnce({ title: '제목', blocks: [] });
		const onSave = vi.fn();
		const { result } = renderHook(() => usePostDrafts({ prepareDocument, initialPosts: INITIAL_POSTS, onSave }));

		act(() => result.current.save());
		act(() => result.current.save());

		expect(prepareDocument).toHaveBeenCalledTimes(2);
		expect(onSave).toHaveBeenCalledWith({ title: '제목', blocks: [] });
	});

	it('목록 모달을 열고 닫는다', () => {
		const { result } = renderHook(() => usePostDrafts({ prepareDocument: vi.fn(), initialPosts: INITIAL_POSTS }));

		act(() => result.current.openList());
		expect(result.current.isListModalOpen).toBe(true);

		act(() => result.current.closeList());
		expect(result.current.isListModalOpen).toBe(false);
	});

	it('삭제를 취소하면 목록을 유지하고 확인하면 선택한 글만 제거한다', () => {
		const { result } = renderHook(() => usePostDrafts({ prepareDocument: vi.fn(), initialPosts: INITIAL_POSTS }));

		act(() => result.current.requestDeletion(1));
		expect(result.current.isDeletionModalOpen).toBe(true);

		act(() => result.current.cancelDeletion());
		expect(result.current.isDeletionModalOpen).toBe(false);
		expect(result.current.posts).toEqual(INITIAL_POSTS);

		act(() => result.current.requestDeletion(1));
		act(() => result.current.confirmDeletion());

		expect(result.current.isDeletionModalOpen).toBe(false);
		expect(result.current.posts).toEqual([INITIAL_POSTS[1]]);
	});
});
