import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import * as cologsApi from '@/shared/api/cologs/api';
import { cologsQueryKeys } from '@/shared/api/cologs/queries/keys';

import { useInviteCologMemberMutation } from './use-invite-colog-member-mutation';

describe('useInviteCologMemberMutation', () => {
	it('멤버 초대 성공 후 정규화한 팀의 멤버 목록 cache를 무효화한다', async () => {
		const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
		const invalidateQueries = vi.spyOn(queryClient, 'invalidateQueries');
		const inviteCologMember = vi.spyOn(cologsApi, 'inviteCologMember').mockResolvedValue({
			status: 201,
			message: '멤버 초대에 성공했습니다.',
			data: { id: 3, userId: 42, permission: 'MEMBER', blogRole: '' },
		});
		const { result } = renderHook(() => useInviteCologMemberMutation(), {
			wrapper: ({ children }) => createElement(QueryClientProvider, { client: queryClient }, children),
		});

		await result.current.mutateAsync({
			slug: '@rilog',
			request: { userId: 42, permission: 'MEMBER' },
		});

		expect(inviteCologMember).toHaveBeenCalledWith('@rilog', { userId: 42, permission: 'MEMBER' });
		expect(invalidateQueries).toHaveBeenCalledWith({
			queryKey: cologsQueryKeys.members('rilog'),
			exact: true,
		});
	});
});
