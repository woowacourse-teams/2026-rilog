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
import { usePublishPostMutation } from '@/shared/api/posts/mutations/use-publish-post-mutation';
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
	const overwrite = useOverwriteDraftMutation();
	const publishDraft = usePublishDraftMutation();
	const publish = usePublishPostMutation();
	const update = useUpdatePostMutation();
	const create = useCreateCologMutation();
	const invite = useInviteCologMemberMutation();
	return {
		'draft.overwrite': () => overwrite.mutateAsync({ draftId: 1, request }),
		'draft.publish': () => publishDraft.mutateAsync({ draftId: 1, request }),
		'post.publish': () => publish.mutateAsync(request),
		'post.update': () => update.mutateAsync({ postId: 1, request }),
		'colog.create': () => create.mutateAsync({ ...INITIAL_COLOG_CREATE_VALUE, name: 'team', slug: 'test-team' }),
		'colog.invite': () => invite.mutateAsync({ slug: 'test-team', request: { userId: 1, permission: 'MEMBER' } }),
	};
}

describe('실제 mutation과 공통 QueryProvider의 보고 소유 경계', () => {
	it.each(['draft.overwrite', 'draft.publish', 'post.publish', 'post.update', 'colog.create', 'colog.invite'] as const)(
		'%s 실패는 전역 fallback과 중복 없이 해당 작업으로 보고한다',
		async (operation) => {
			const error = await createApiFailure('INVALID_REQUEST_BODY');
			vi.spyOn(draftsApi, 'overwriteDraft').mockRejectedValue(error);
			vi.spyOn(draftsApi, 'publishDraft').mockRejectedValue(error);
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
		},
	);
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
