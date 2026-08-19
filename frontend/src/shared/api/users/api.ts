import type { MyCologPreviewResponse, MyInfoResponse, OnboardingRequest } from './types';

import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';

export const readMyCologsPreview = () =>
	apiClient.get<ApiResponse<MyCologPreviewResponse[]>>('v1/users/me/cologs/preview');

export const readMyInfo = () => apiClient.get<ApiResponse<MyInfoResponse>>('v1/users/me');

export const completeOnboarding = async (data: OnboardingRequest) => {
	return await apiClient.patch<ApiResponse<null>>('v1/users/me/onboarding', {
		json: data,
	});
};
