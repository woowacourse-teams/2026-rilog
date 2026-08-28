import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Block } from '@blocknote/core';

import { getAnalyticsFailureStage } from '@/features/analytics/model/analytics-event';
import type { PublishPostCommand } from '@/features/post-write/model/post-publication';

import { usePublishNewPost, usePublishPostDraft, useUpdatePublishedPost } from './use-post-publishers';

const { requestDraftPublicationMock, requestPublicationMock, requestUpdateMock, uploadFileMock } = vi.hoisted(() => ({
	requestDraftPublicationMock: vi.fn(),
	requestPublicationMock: vi.fn(),
	requestUpdateMock: vi.fn(),
	uploadFileMock: vi.fn(),
}));

vi.mock('@/shared/api/posts/mutations/use-publish-post-mutation', () => ({
	usePublishPostMutation: () => ({ mutateAsync: requestPublicationMock }),
}));

vi.mock('@/shared/api/drafts/mutations/use-publish-draft-mutation', () => ({
	usePublishDraftMutation: () => ({ mutateAsync: requestDraftPublicationMock }),
}));

vi.mock('@/shared/api/posts/mutations/use-update-post-mutation', () => ({
	useUpdatePostMutation: () => ({ mutateAsync: requestUpdateMock }),
}));

vi.mock('@/shared/api/uploads/mutations/use-upload-file-mutation', () => ({
	useUploadFileMutation: () => ({ mutateAsync: uploadFileMock }),
}));

const paragraph: Block = {
	id: 'paragraph',
	type: 'paragraph',
	props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
	content: [],
	children: [],
};

const command: PublishPostCommand = {
	document: { title: '게시글 제목', blocks: [paragraph] },
	settings: {
		category: 'IT',
		blog: { id: 1, slug: 'rilog', name: 'Rilog' },
		representativeImage: null,
		representativeImageUrl: 'posts/existing.png',
	},
};

describe('post publishers', () => {
	beforeEach(() => {
		requestDraftPublicationMock.mockReset();
		requestPublicationMock.mockReset();
		requestUpdateMock.mockReset();
		uploadFileMock.mockReset();
	});

	it('새 글 발행 API 오류에 publish_request 단계를 부여한다', async () => {
		const requestError = new TypeError('발행 요청 실패');
		requestPublicationMock.mockRejectedValue(requestError);
		const { result } = renderHook(() => usePublishNewPost());

		const error = await result.current(command).catch((cause: unknown) => cause);

		expect(error).toBe(requestError);
		expect(getAnalyticsFailureStage(error)).toBe('publish_request');
	});

	it('수정 API 오류에도 publish_request 단계를 부여한다', async () => {
		const requestError = new TypeError('수정 요청 실패');
		requestUpdateMock.mockRejectedValue(requestError);
		const { result } = renderHook(() => useUpdatePublishedPost(31));

		const error = await result.current(command).catch((cause: unknown) => cause);

		expect(error).toBe(requestError);
		expect(getAnalyticsFailureStage(error)).toBe('publish_request');
	});

	it('임시저장 글 발행 API 오류에도 publish_request 단계를 부여한다', async () => {
		const requestError = new TypeError('임시저장 발행 요청 실패');
		requestDraftPublicationMock.mockRejectedValue(requestError);
		const { result } = renderHook(() => usePublishPostDraft());

		const error = await result.current(42, command).catch((cause: unknown) => cause);

		expect(error).toBe(requestError);
		expect(getAnalyticsFailureStage(error)).toBe('publish_request');
	});

	it('응답 변환 실패의 publish_response 단계를 덮어쓰지 않는다', async () => {
		requestPublicationMock.mockResolvedValue({ status: 201, message: '응답 데이터 없음' });
		const { result } = renderHook(() => usePublishNewPost());

		const error = await result.current(command).catch((cause: unknown) => cause);

		expect(getAnalyticsFailureStage(error)).toBe('publish_response');
	});
});
