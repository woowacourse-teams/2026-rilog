import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DraftPostItem } from '../model/post-draft';

import { usePostDrafts } from './use-post-drafts';

const INITIAL_POSTS: readonly DraftPostItem[] = [
	{ id: 1, title: '첫 번째 글', savedAt: '2026-08-21T04:40:07.585624' },
	{ id: 2, title: '두 번째 글', savedAt: '2026-08-20T04:40:07.585624' },
];

describe('usePostDrafts', () => {
	it('문서 준비가 성공할 때와 실패할 때 모두 최신 문서를 준비한다', async () => {
		const prepareDocument = vi.fn().mockReturnValueOnce(null).mockReturnValueOnce({ title: '제목', blocks: [] });
		const onSave = vi.fn();
		const { result } = renderHook(() =>
			usePostDrafts({ prepareDocument, posts: INITIAL_POSTS, onSave, onDelete: vi.fn() }),
		);

		await act(() => result.current.save());
		await act(() => result.current.save());

		expect(prepareDocument).toHaveBeenCalledTimes(2);
		expect(onSave).toHaveBeenCalledWith({ title: '제목', blocks: [] });
	});

	it('저장 요청 중 pending 상태를 표시하고 중복 저장을 막는다', async () => {
		let resolveSave: (() => void) | undefined;
		const onSave = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveSave = resolve;
				}),
		);
		const { result } = renderHook(() =>
			usePostDrafts({
				prepareDocument: () => ({ title: '제목', blocks: [] }),
				onSave,
				onDelete: vi.fn(),
			}),
		);

		act(() => {
			void result.current.save();
		});
		expect(result.current.isSaving).toBe(true);

		await act(() => result.current.save());
		expect(onSave).toHaveBeenCalledOnce();

		await act(async () => {
			resolveSave?.();
			await Promise.resolve();
		});
		expect(result.current.isSaving).toBe(false);
	});

	it('목록 모달을 열고 닫는다', () => {
		const { result } = renderHook(() =>
			usePostDrafts({ prepareDocument: vi.fn(), posts: INITIAL_POSTS, onDelete: vi.fn() }),
		);

		act(() => result.current.openList());
		expect(result.current.isListModalOpen).toBe(true);

		act(() => result.current.closeList());
		expect(result.current.isListModalOpen).toBe(false);
	});

	it('삭제를 취소하면 요청하지 않고 확인하면 선택한 postId로 삭제한다', async () => {
		const onDelete = vi.fn().mockResolvedValue(undefined);
		const { result } = renderHook(() => usePostDrafts({ prepareDocument: vi.fn(), posts: INITIAL_POSTS, onDelete }));

		act(() => result.current.requestDeletion(1));
		expect(result.current.isDeletionModalOpen).toBe(true);

		act(() => result.current.cancelDeletion());
		expect(result.current.isDeletionModalOpen).toBe(false);
		expect(result.current.posts).toEqual(INITIAL_POSTS);
		expect(onDelete).not.toHaveBeenCalled();

		act(() => result.current.requestDeletion(1));
		await act(() => result.current.confirmDeletion());

		expect(result.current.isDeletionModalOpen).toBe(false);
		expect(onDelete).toHaveBeenCalledWith(1);
	});

	it('삭제 요청이 실패하면 선택과 확인 모달을 유지한다', async () => {
		const onDelete = vi.fn().mockRejectedValue(new Error('삭제 실패'));
		const { result } = renderHook(() => usePostDrafts({ prepareDocument: vi.fn(), posts: INITIAL_POSTS, onDelete }));

		act(() => result.current.requestDeletion(1));
		await act(() => result.current.confirmDeletion());

		expect(result.current.isDeletionModalOpen).toBe(true);
		expect(onDelete).toHaveBeenCalledWith(1);
	});
});
