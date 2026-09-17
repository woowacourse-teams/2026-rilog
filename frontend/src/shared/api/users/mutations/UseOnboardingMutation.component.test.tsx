import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import { usersQueryKeys } from '@/shared/api/users/queries/keys';

import * as usersApi from '../api';

import { useOnboardingMutation } from './use-onboarding-mutation';

afterEach(() => vi.restoreAllMocks());

describe('useOnboardingMutation', () => {
	it.each(['success', 'error'] as const)(
		'가입 성공 시 이전 내 정보 %s 캐시를 초기화하고 재조회는 로그인 전환에 맡긴다',
		async (status) => {
			const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
			const queryKey = usersQueryKeys.myInfo();
			if (status === 'success') {
				queryClient.setQueryData(queryKey, { data: { id: 1, nickname: '이전 정보' } });
			} else {
				await expect(
					queryClient.fetchQuery({ queryKey, queryFn: () => Promise.reject(new Error('이전 조회 실패')) }),
				).rejects.toThrow('이전 조회 실패');
			}
			const readMyInfo = vi.spyOn(usersApi, 'readMyInfo');
			vi.spyOn(usersApi, 'completeOnboarding').mockResolvedValue({
				data: { status: 200, message: '가입 완료' },
				accessToken: 'access-token',
			});
			function Wrapper({ children }: { children: ReactNode }) {
				return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
			}
			const { result } = renderHook(() => useOnboardingMutation(), { wrapper: Wrapper });
			await act(async () => {
				await result.current.mutateAsync({ nickname: '리로그', slug: 'rilog' });
			});
			expect(queryClient.getQueryState(queryKey)).toMatchObject({
				data: undefined,
				error: null,
				status: 'pending',
				fetchStatus: 'idle',
			});
			expect(readMyInfo).not.toHaveBeenCalled();
		},
	);
});
