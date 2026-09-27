import { useQueryClient } from '@tanstack/react-query';
import { renderHook, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { INITIAL_COLOG_CREATE_VALUE } from '@/features/colog-create/model/colog-create';
import * as cologsApi from '@/shared/api/cologs/api';
import { useCreateCologMutation } from '@/shared/api/cologs/mutations/use-create-colog-mutation';
import { useInviteCologMemberMutation } from '@/shared/api/cologs/mutations/use-invite-colog-member-mutation';
import * as draftsApi from '@/shared/api/drafts/api';
import { useOverwriteDraftMutation } from '@/shared/api/drafts/mutations/use-overwrite-draft-mutation';
import { usePublishDraftMutation } from '@/shared/api/drafts/mutations/use-publish-draft-mutation';
import * as postsApi from '@/shared/api/posts/api';
import { useAddPostCommentAnchorMutation } from '@/shared/api/posts/mutations/use-add-comment-anchor-mutation';
import { useCreatePostCommentAnchorMutation } from '@/shared/api/posts/mutations/use-create-comment-anchor-mutation';
import { useDeletePostCommentAnchorMutation } from '@/shared/api/posts/mutations/use-delete-comment-anchor-mutation';
import { usePublishPostMutation } from '@/shared/api/posts/mutations/use-publish-post-mutation';
import { useUpdatePostCommentAnchorMutation } from '@/shared/api/posts/mutations/use-update-comment-anchor-mutation';
import { useUpdatePostMutation } from '@/shared/api/posts/mutations/use-update-post-mutation';
import type { PostWriteRequest } from '@/shared/api/posts/types';
import QueryProvider from '@/shared/query/QueryProvider';
import { createApiFailure } from '@/test/fixtures/api-error';

const { captureExceptionMock } = vi.hoisted(() => ({ captureExceptionMock: vi.fn() }));
vi.mock('@/shared/error-tracking/error-tracker-instance', async () => {
	const { createSentryErrorTracker } = await import('@/shared/error-tracking/sentry-error-tracker');
	const tracker = createSentryErrorTracker();
	tracker.captureException = captureExceptionMock;
	return { errorTracker: tracker, sentryErrorTracker: tracker };
});
afterEach(() => {
	vi.restoreAllMocks();
	captureExceptionMock.mockClear();
});

const request: PostWriteRequest = {
	slug: 'test-blog',
	title: 'title',
	content: [],
	category: 'TECH',
	visibility: 'PUBLIC',
	thumbnailImageUrl: null,
	chapterId: null,
};

function useActions() {
	const createComment = useCreatePostCommentAnchorMutation(81);
	const addComment = useAddPostCommentAnchorMutation(81, 1);
	const updateComment = useUpdatePostCommentAnchorMutation(81, 1);
	const deleteComment = useDeletePostCommentAnchorMutation(81, 1);
	const overwrite = useOverwriteDraftMutation();
	const publishDraft = usePublishDraftMutation();
	const publish = usePublishPostMutation();
	const update = useUpdatePostMutation();
	const create = useCreateCologMutation();
	const invite = useInviteCologMemberMutation();
	return {
		'inline-comment.create': () =>
			createComment.mutateAsync({
				blockId: 'block',
				startOffset: 0,
				endOffset: 2,
				selectedText: '인용',
				content: '댓글',
			}),
		'inline-comment.add': () => addComment.mutateAsync({ content: '댓글' }),
		'inline-comment.update': () => updateComment.mutateAsync({ content: '댓글' }),
		'inline-comment.delete': () => deleteComment.mutateAsync(),
		'draft.overwrite': () => overwrite.mutateAsync({ draftId: 1, request }),
		'draft.publish': () => publishDraft.mutateAsync({ draftId: 1, request }),
		'post.publish': () => publish.mutateAsync(request),
		'post.update': () => update.mutateAsync({ postId: 1, request }),
		'colog.create': () => create.mutateAsync({ ...INITIAL_COLOG_CREATE_VALUE, name: 'team', slug: 'test-team' }),
		'colog.invite': () => invite.mutateAsync({ slug: 'test-team', request: { userId: 1, permission: 'MEMBER' } }),
	};
}

describe('실제 mutation과 공통 QueryProvider의 보고 소유 경계', () => {
	it.each([
		'draft.overwrite',
		'draft.publish',
		'post.publish',
		'post.update',
		'colog.create',
		'colog.invite',
		'inline-comment.create',
		'inline-comment.add',
		'inline-comment.update',
		'inline-comment.delete',
	] as const)('%s 실패는 전역 fallback과 중복 없이 해당 작업으로 보고한다', async (operation) => {
		const error = await createApiFailure('INVALID_REQUEST_BODY');
		vi.spyOn(draftsApi, 'overwriteDraft').mockRejectedValue(error);
		vi.spyOn(draftsApi, 'publishDraft').mockRejectedValue(error);
		vi.spyOn(postsApi, 'createPostCommentAnchor').mockRejectedValue(error);
		vi.spyOn(postsApi, 'addPostCommentAnchor').mockRejectedValue(error);
		vi.spyOn(postsApi, 'updatePostCommentAnchor').mockRejectedValue(error);
		vi.spyOn(postsApi, 'deletePostCommentAnchor').mockRejectedValue(error);
		vi.spyOn(postsApi, 'publishPost').mockRejectedValue(error);
		vi.spyOn(postsApi, 'updatePost').mockRejectedValue(error);
		vi.spyOn(cologsApi, 'createColog').mockRejectedValue(error);
		vi.spyOn(cologsApi, 'inviteCologMember').mockRejectedValue(error);
		const { result } = renderHook(useActions, { wrapper: QueryProvider });
		await act(async () => {
			await expect(result.current[operation]()).rejects.toBe(error);
		});
		expect(captureExceptionMock).toHaveBeenCalledTimes(1);
		expect(captureExceptionMock).toHaveBeenCalledWith(error, { tags: { operation }, level: 'error' });
	});
	it('조회 재시도 중 복구하면 보고하지 않고 최종 실패만 보고한다', async () => {
		const { result } = renderHook(useQueryClient, { wrapper: QueryProvider });
		const error = await createApiFailure('INTERNAL_SERVER_ERROR', 500);
		const queryFn = vi.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('ok');
		await expect(result.current.fetchQuery({ queryKey: ['recovery'], queryFn, retry: 1, retryDelay: 0 })).resolves.toBe(
			'ok',
		);
		expect(captureExceptionMock).not.toHaveBeenCalled();
		queryFn.mockRejectedValue(error);
		await expect(result.current.fetchQuery({ queryKey: ['failure'], queryFn, retry: 1, retryDelay: 0 })).rejects.toBe(
			error,
		);
		expect(captureExceptionMock).toHaveBeenCalledTimes(1);
	});
});

it.each(['inline-comment.create', 'inline-comment.add', 'inline-comment.update', 'inline-comment.delete'] as const)(
	'%s의 5xx는 공통 경계와 중복 없이 한 번만 보고한다',
	async (operation) => {
		const error = await createApiFailure('INTERNAL_SERVER_ERROR', 503);
		vi.spyOn(postsApi, 'createPostCommentAnchor').mockRejectedValue(error);
		vi.spyOn(postsApi, 'addPostCommentAnchor').mockRejectedValue(error);
		vi.spyOn(postsApi, 'updatePostCommentAnchor').mockRejectedValue(error);
		vi.spyOn(postsApi, 'deletePostCommentAnchor').mockRejectedValue(error);
		const { result } = renderHook(useActions, { wrapper: QueryProvider });
		await act(async () => {
			await expect(result.current[operation]()).rejects.toBe(error);
		});
		expect(captureExceptionMock).toHaveBeenCalledExactlyOnceWith(error, { tags: { operation }, level: 'error' });
	},
);
it.each(['COMMENT_ANCHOR_NOT_FOUND', 'COMMENT_ANCHOR_DELETE_FORBIDDEN', 'COMMENT_ANCHOR_NOT_ACTIVE'])(
	'댓글 정상 거부 %s는 호출자에 전달하지만 보고하지 않는다',
	async (code) => {
		const error = await createApiFailure(
			code,
			code === 'COMMENT_ANCHOR_NOT_ACTIVE' ? 409 : code === 'COMMENT_ANCHOR_NOT_FOUND' ? 404 : 403,
		);
		vi.spyOn(postsApi, 'deletePostCommentAnchor').mockRejectedValue(error);
		const { result } = renderHook(useActions, { wrapper: QueryProvider });
		await act(async () => {
			await expect(result.current['inline-comment.delete']()).rejects.toBe(error);
		});
		expect(captureExceptionMock).not.toHaveBeenCalled();
	},
);
it('실제 댓글 길이 제약 위반은 제외하고 정상 내용의 서버 거부는 보고한다', async () => {
	const { result } = renderHook(() => useAddPostCommentAnchorMutation(81, 1), { wrapper: QueryProvider });
	const tooLong = await createApiFailure('INVALID_COMMENT_CONTENT');
	vi.spyOn(postsApi, 'addPostCommentAnchor').mockRejectedValueOnce(tooLong);
	await act(async () => {
		await expect(result.current.mutateAsync({ content: '가'.repeat(1001) })).rejects.toBe(tooLong);
	});
	expect(captureExceptionMock).not.toHaveBeenCalled();
	const unexpected = await createApiFailure('INVALID_COMMENT_CONTENT');
	vi.mocked(postsApi.addPostCommentAnchor).mockRejectedValueOnce(unexpected);
	await act(async () => {
		await expect(result.current.mutateAsync({ content: '정상 댓글' })).rejects.toBe(unexpected);
	});
	expect(captureExceptionMock).toHaveBeenCalledExactlyOnceWith(unexpected, {
		tags: { operation: 'inline-comment.add' },
		level: 'error',
	});
});
