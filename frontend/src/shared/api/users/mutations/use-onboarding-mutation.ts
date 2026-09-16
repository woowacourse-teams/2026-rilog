'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { OnboardingRequest } from '../types';

import { completeOnboarding } from '../api';
import { usersQueryKeys } from '../queries/keys';

export const useOnboardingMutation = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: OnboardingRequest) => completeOnboarding(data),
		onSuccess: async () => {
			const filters = { queryKey: usersQueryKeys.myInfo(), exact: true };
			await queryClient.cancelQueries(filters);
			// 온보딩 중 비활성인 내 정보 query를 비워 정식 로그인 후 새 토큰으로 조회한다.
			await queryClient.resetQueries(filters);
		},
	});
};
