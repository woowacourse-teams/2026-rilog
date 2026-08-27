import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import * as draftsApi from '@/shared/api/drafts/api';
import { draftsQueryKeys } from '@/shared/api/drafts/queries/keys';

import { useDeleteDraftMutation } from './use-delete-draft-mutation';

describe('useDeleteDraftMutation', () => {
	it('삭제 성공 후 해당 상세 cache를 제거하고 drafts cache를 무효화한다', async () => {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const removeQueries = vi.spyOn(queryClient, 'removeQueries');
		const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
		const deleteDraft = vi.spyOn(draftsApi, 'deleteDraft').mockResolvedValue(new Response(null, { status: 204 }));
		const { result } = renderHook(() => useDeleteDraftMutation(), {
			wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children),
		});

		await result.current.mutateAsync(42);

		expect(deleteDraft).toHaveBeenCalledWith(42);
		expect(removeQueries).toHaveBeenCalledWith({ queryKey: draftsQueryKeys.detail(42), exact: true });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: draftsQueryKeys.all });
	});
});
