import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { blogsQueryKeys } from '@/shared/api/blogs/queries/keys';
import * as cologsApi from '@/shared/api/cologs/api';
import { cologsQueryKeys } from '@/shared/api/cologs/queries/keys';
import { feedsQueryKeys } from '@/shared/api/feeds/queries/keys';
import { usersQueryKeys } from '@/shared/api/users/queries/keys';

import { useDeleteCologMutation } from './use-delete-colog-mutation';

describe('useDeleteCologMutation', () => {
	it('팀 삭제 성공 후 관련 팀, 블로그, 피드와 내 팀 목록 cache를 무효화한다', async () => {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
		const deleteColog = vi.spyOn(cologsApi, 'deleteColog').mockResolvedValue(new Response(null, { status: 204 }));
		const { result } = renderHook(() => useDeleteCologMutation(), {
			wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children),
		});

		await result.current.mutateAsync('@rilog');

		expect(deleteColog).toHaveBeenCalledWith('@rilog');
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: cologsQueryKeys.all });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: blogsQueryKeys.all });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: feedsQueryKeys.all });
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: usersQueryKeys.myCologsOverview() });
		expect(invalidateQueries).toHaveBeenCalledTimes(4);
	});

	it('관련 cache 재검증이 끝나기 전에 consumer의 삭제 성공 후속 동작을 실행한다', async () => {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		let finishInvalidation: (() => void) | undefined;
		const invalidation = new Promise<void>((resolve) => {
			finishInvalidation = resolve;
		});
		const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries').mockReturnValue(invalidation);
		vi.spyOn(cologsApi, 'deleteColog').mockResolvedValue(new Response(null, { status: 204 }));
		const onSuccess = vi.fn();
		const { result } = renderHook(() => useDeleteCologMutation(), {
			wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children),
		});

		act(() => {
			result.current.mutate('@rilog', { onSuccess });
		});
		await vi.waitFor(() => expect(invalidateQueries).toHaveBeenCalledTimes(4));

		expect(onSuccess).toHaveBeenCalledOnce();
		finishInvalidation?.();
	});
});
