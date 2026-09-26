import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import * as draftsApi from '@/shared/api/drafts/api';
import { draftsQueryKeys } from '@/shared/api/drafts/queries/keys';
import { createApiFailure } from '@/test/fixtures/api-error';
import { createTestQueryClient } from '@/test/render-with-query';

import { useSaveDraftMutation } from './use-save-draft-mutation';

const { captureExceptionMock } = vi.hoisted(() => ({ captureExceptionMock: vi.fn() }));
vi.mock('@/shared/error-tracking/error-tracker-instance', async () => {
	const { createSentryErrorTracker } = await import('@/shared/error-tracking/sentry-error-tracker');
	const tracker = createSentryErrorTracker();
	tracker.captureException = captureExceptionMock;
	return { errorTracker: tracker, sentryErrorTracker: tracker };
});

describe('useSaveDraftMutation', () => {
	it('최초 임시저장 성공 후 drafts cache를 무효화한다', async () => {
		const queryClient = createTestQueryClient();
		const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
		vi.spyOn(draftsApi, 'saveDraft').mockResolvedValue({
			status: 201,
			message: '최초 임시저장에 성공했습니다.',
			data: { draftId: 42 },
		});
		const { result } = renderHook(() => useSaveDraftMutation(), {
			wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children),
		});

		await result.current.mutateAsync({ title: '작성 중인 글', content: [] });

		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: draftsQueryKeys.all });
	});
	it.each([
		{ code: 'INVALID_POST_CONTENT', collect: true },
		{ code: 'DRAFT_NOT_FOUND', collect: false },
		{ code: 'REQUEST_VALIDATION_FAILED', collect: false },
	])('$code 저장 실패의 수집 정책과 원래 rejection을 유지한다', async ({ code, collect }) => {
		captureExceptionMock.mockClear();
		const error = await createApiFailure(code, 400, [{ name: 'title', reason: '제목은 512자 이하여야 합니다.' }]);
		vi.spyOn(draftsApi, 'saveDraft').mockRejectedValue(error);
		const queryClient = createTestQueryClient();
		const { result } = renderHook(() => useSaveDraftMutation(), {
			wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children),
		});
		await expect(result.current.mutateAsync({ title: '글'.repeat(513), content: [] })).rejects.toBe(error);
		expect(captureExceptionMock).toHaveBeenCalledTimes(collect ? 1 : 0);
	});
});
