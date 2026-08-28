import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import * as draftsApi from '@/shared/api/drafts/api';
import { draftsQueryKeys } from '@/shared/api/drafts/queries/keys';

import { useSaveDraftMutation } from './use-save-draft-mutation';

describe('useSaveDraftMutation', () => {
	it('최초 임시저장 성공 후 drafts cache를 무효화한다', async () => {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
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
});
