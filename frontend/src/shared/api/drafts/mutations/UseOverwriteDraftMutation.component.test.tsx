import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import * as draftsApi from '@/shared/api/drafts/api';
import { draftsQueryKeys } from '@/shared/api/drafts/queries/keys';

import { useOverwriteDraftMutation } from './use-overwrite-draft-mutation';

describe('useOverwriteDraftMutation', () => {
	it('덮어쓰기 성공 후 drafts cache를 무효화한다', async () => {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
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
});
