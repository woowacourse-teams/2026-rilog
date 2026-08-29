import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
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
		expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: usersQueryKeys.myCologsPreview() });
		expect(invalidateQueries).toHaveBeenCalledTimes(4);
	});
});
