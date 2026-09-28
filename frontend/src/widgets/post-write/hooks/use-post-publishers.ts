'use client';

import { useCallback } from 'react';

import { withAnalyticsFailureStage } from '@/features/analytics/model/analytics-event';
import { buildDraftPublishRequest } from '@/features/post-write/lib/build-draft-publish-request';
import { buildPostWriteRequest } from '@/features/post-write/lib/build-post-write-request';
import { mapDraftPublishResponse } from '@/features/post-write/lib/map-draft-publish-response';
import { mapPostWriteResponse } from '@/features/post-write/lib/map-post-write-response';
import type { PublishPost } from '@/features/post-write/model/post-publication';
import type { PublishPostDraft } from '@/features/post-write/model/post-write-flow';
import { usePublishDraftMutation } from '@/shared/api/drafts/mutations/use-publish-draft-mutation';
import { usePublishPostMutation } from '@/shared/api/posts/mutations/use-publish-post-mutation';
import { useUpdatePostMutation } from '@/shared/api/posts/mutations/use-update-post-mutation';
import { isInvalidApiResponseError } from '@/shared/api/response-validation';
import { useUploadFileMutation } from '@/shared/api/uploads/mutations/use-upload-file-mutation';

const toPublicationError = (error: unknown): Error => {
	if (isInvalidApiResponseError(error)) {
		return withAnalyticsFailureStage(
			new Error('요청 결과를 확인하지 못했습니다. 이미 저장됐을 수 있으니 목록에서 결과를 확인해 주세요.'),
			'publish_response',
		);
	}
	if (error instanceof Error && 'analyticsFailureStage' in error) return error;
	return withAnalyticsFailureStage(error, 'publish_request');
};

export function usePublishNewPost(): PublishPost {
	const { mutateAsync: uploadFile } = useUploadFileMutation();
	const { mutateAsync: requestPublication } = usePublishPostMutation();

	return useCallback<PublishPost>(
		async (command) => {
			const request = await buildPostWriteRequest(command, async (file) => {
				const { objectKey } = await uploadFile({ file, type: 'IMAGE' });
				return objectKey;
			});

			try {
				return mapPostWriteResponse(await requestPublication(request));
			} catch (error) {
				throw toPublicationError(error);
			}
		},
		[requestPublication, uploadFile],
	);
}

export function usePublishPostDraft(): PublishPostDraft {
	const { mutateAsync: uploadFile } = useUploadFileMutation();
	const { mutateAsync: requestPublication } = usePublishDraftMutation();

	return useCallback<PublishPostDraft>(
		async (draftId, command) => {
			const request = await buildDraftPublishRequest(command, async (file) => {
				const { objectKey } = await uploadFile({ file, type: 'IMAGE' });
				return objectKey;
			});

			try {
				return mapDraftPublishResponse(await requestPublication({ draftId, request }));
			} catch (error) {
				throw toPublicationError(error);
			}
		},
		[requestPublication, uploadFile],
	);
}

export function useUpdatePublishedPost(postId: number): PublishPost {
	const { mutateAsync: uploadFile } = useUploadFileMutation();
	const { mutateAsync: requestUpdate } = useUpdatePostMutation();

	return useCallback<PublishPost>(
		async (command) => {
			const request = await buildPostWriteRequest(command, async (file) => {
				const { objectKey } = await uploadFile({ file, type: 'IMAGE' });
				return objectKey;
			});

			try {
				return mapPostWriteResponse(await requestUpdate({ postId, request }));
			} catch (error) {
				throw toPublicationError(error);
			}
		},
		[postId, requestUpdate, uploadFile],
	);
}
