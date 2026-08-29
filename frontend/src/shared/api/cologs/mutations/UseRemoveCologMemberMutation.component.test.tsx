import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import * as cologsApi from '@/shared/api/cologs/api';
import { cologsQueryKeys } from '@/shared/api/cologs/queries/keys';

import { useRemoveCologMemberMutation } from './use-remove-colog-member-mutation';

describe('useRemoveCologMemberMutation', () => {
	it('멤버 내보내기 성공 후 정규화한 팀의 멤버 목록 cache를 무효화한다', async () => {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
		const removeCologMember = vi
			.spyOn(cologsApi, 'removeCologMember')
			.mockResolvedValue(new Response(null, { status: 204 }));
		const { result } = renderHook(() => useRemoveCologMemberMutation(), {
			wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children),
		});

		await result.current.mutateAsync({ slug: '@rilog', memberId: 42 });

		expect(removeCologMember).toHaveBeenCalledWith('@rilog', 42);
		expect(invalidateQueries).toHaveBeenCalledWith({
			queryKey: cologsQueryKeys.members('rilog'),
			exact: true,
		});
	});
});
