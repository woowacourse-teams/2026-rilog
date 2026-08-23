import type {
	MyCologPreviewResponse,
	MyInfoResponse,
	OnboardingRequest,
	ReadUserBySlugRequest,
	ReadUserBySlugResponse,
} from './types';

import { apiClient, apiRequest, kyInstance } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';


export const readUserBySlug = ({ slug }: ReadUserBySlugRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.get<ApiResponse<ReadUserBySlugResponse>>(`v1/users/${encodeURIComponent(normalizedSlug)}`);
};

export const readMyCologsPreview = () =>
	apiClient.get<ApiResponse<MyCologPreviewResponse[]>>('v1/users/me/cologs/preview');

export const readMyInfo = () => apiClient.get<ApiResponse<MyInfoResponse>>('v1/users/me');

export const completeOnboarding = async (data: OnboardingRequest) => {
	const response = await apiRequest(() =>
		kyInstance.patch('v1/users/me/onboarding', {
			json: data,
		}),
	);

	const responseData = await response.json<ApiResponse<null>>();
	const authorizationHeader = response.headers.get('Authorization');
	const accessToken = authorizationHeader ? authorizationHeader.replace('Bearer ', '') : null;

	return {
		data: responseData,
		accessToken,
	};
};
