import { QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { normalizeApiError } from '@/shared/api/api-error';
import * as draftsApi from '@/shared/api/drafts/api';
import { draftsQueryKeys } from '@/shared/api/drafts/queries/keys';
import { InvalidApiResponseError } from '@/shared/api/response-validation';
import { createTestQueryClient } from '@/test/render-with-query';

import { useOverwriteDraftMutation } from './use-overwrite-draft-mutation';

describe('useOverwriteDraftMutation', () => {
	it('덮어쓰기 성공 후 drafts cache를 무효화한다', async () => {
		const queryClient = createTestQueryClient();
		const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
		const overwriteDraft = vi.spyOn(draftsApi, 'overwriteDraft').mockResolvedValue({
			status: 200,
			message: '임시저장을 덮어썼습니다.',
			data: { draftId: 42 },
		});
		const { result } = renderHook(() => useOverwriteDraftMutation(), {
			wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children),
		});
		const request = { title: '수정한 제목', content: [] };

		await result.current.mutateAsync({ draftId: 42, request });

		expect(overwriteDraft).toHaveBeenCalledWith(42, request);
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: draftsQueryKeys.all });
	});

	it('덮어쓰기 응답 확인에 실패하면 기존 목록을 새로 조회한다', async () => {
		const queryClient = createTestQueryClient();
		const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
		const error = normalizeApiError(new InvalidApiResponseError('overwrite draft'));
		vi.spyOn(draftsApi, 'overwriteDraft').mockRejectedValue(error);
		const { result } = renderHook(() => useOverwriteDraftMutation(), {
			wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children),
		});

		await expect(
			result.current.mutateAsync({ draftId: 42, request: { title: '수정한 제목', content: [] } }),
		).rejects.toBe(error);
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: draftsQueryKeys.all });
	});
});
