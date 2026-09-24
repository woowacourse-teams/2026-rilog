import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Block } from '@blocknote/core';
import type { PropsWithChildren } from 'react';

import { getAnalyticsFailureStage } from '@/features/analytics/model/analytics-event';
import type { PublishPostCommand } from '@/features/post-write/model/post-publication';
import * as draftsApi from '@/shared/api/drafts/api';
import * as postsApi from '@/shared/api/posts/api';
import { createTestQueryClient } from '@/test/render-with-query';

import { usePublishNewPost, usePublishPostDraft, useUpdatePublishedPost } from './use-post-publishers';

const createWrapper = () => {
	const queryClient = createTestQueryClient();

	return function Wrapper({ children }: PropsWithChildren) {
		return createElement(QueryClientProvider, { client: queryClient }, children);
	};
};

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
		category: 'TECH',
		blog: { type: 'RILOG', slug: 'rilog' },
		chapterId: 12,
		representativeImage: null,
		representativeImageUrl: 'posts/existing.png',
	},
};

describe('post publishers', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('새 글 발행 API 오류에 publish_request 단계를 부여한다', async () => {
		const requestError = new TypeError('발행 요청 실패');
		vi.spyOn(postsApi, 'publishPost').mockRejectedValue(requestError);
		const { result } = renderHook(() => usePublishNewPost(), { wrapper: createWrapper() });

		const error = await result.current(command).catch((cause: unknown) => cause);

		expect(error).toBe(requestError);
		expect(getAnalyticsFailureStage(error)).toBe('publish_request');
	});

	it('수정 API 오류에도 publish_request 단계를 부여한다', async () => {
		const requestError = new TypeError('수정 요청 실패');
		vi.spyOn(postsApi, 'updatePost').mockRejectedValue(requestError);
		const { result } = renderHook(() => useUpdatePublishedPost(31), { wrapper: createWrapper() });

		const error = await result.current(command).catch((cause: unknown) => cause);

		expect(error).toBe(requestError);
		expect(getAnalyticsFailureStage(error)).toBe('publish_request');
	});

	it('임시저장 글 발행 API 오류에도 publish_request 단계를 부여한다', async () => {
		const requestError = new TypeError('임시저장 발행 요청 실패');
		vi.spyOn(draftsApi, 'publishDraft').mockRejectedValue(requestError);
		const { result } = renderHook(() => usePublishPostDraft(), { wrapper: createWrapper() });

		const error = await result.current(42, command).catch((cause: unknown) => cause);

		expect(error).toBe(requestError);
		expect(getAnalyticsFailureStage(error)).toBe('publish_request');
	});

	it('응답 변환 실패의 publish_response 단계를 덮어쓰지 않는다', async () => {
		vi.spyOn(postsApi, 'publishPost').mockResolvedValue({ status: 201, message: '응답 데이터 없음' });
		const { result } = renderHook(() => usePublishNewPost(), { wrapper: createWrapper() });

		const error = await result.current(command).catch((cause: unknown) => cause);

		expect(getAnalyticsFailureStage(error)).toBe('publish_response');
	});
});
