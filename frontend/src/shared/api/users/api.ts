import type {
	MyCologOverviewResponse,
	MyInfoResponse,
	OnboardingRequest,
	ReadUserBySlugRequest,
	ReadUserBySlugResponse,
} from './types';

import { requireBearerToken } from '@/shared/api/auth/authorization-header';
import { apiClient, apiRequest, kyInstance } from '@/shared/api/client';
import { isRecord, parseApiJsonResponse } from '@/shared/api/response-validation';
import type { ApiResponse } from '@/shared/api/shared.types';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

const isMyInfoResponse = (value: unknown): value is MyInfoResponse =>
	isRecord(value) &&
	typeof value.id === 'number' &&
	Number.isFinite(value.id) &&
	typeof value.slug === 'string' &&
	typeof value.nickname === 'string' &&
	(value.profileImageUrl === null || typeof value.profileImageUrl === 'string');

const isNull = (value: unknown): value is null => value === null;

export const readUserBySlug = ({ slug }: ReadUserBySlugRequest) => {
	const normalizedSlug = stripAtPrefix(slug);

	return apiClient.get<ApiResponse<ReadUserBySlugResponse>>(`v1/users/${encodeURIComponent(normalizedSlug)}`);
};

export const readMyCologsOverview = () =>
	apiClient.get<ApiResponse<MyCologOverviewResponse[]>>('v1/users/me/cologs/overview');

export const readMyInfo = (signal?: AbortSignal) =>
	apiRequest(async () => {
		const response = await kyInstance.get('v1/users/me', { signal });
		return parseApiJsonResponse(response, 'users.me', isMyInfoResponse);
	});

export const completeOnboarding = async (data: OnboardingRequest) => {
	return apiRequest(async () => {
		const response = await kyInstance.patch('v1/users/me/onboarding', {
			json: data,
		});
		const responseData = await parseApiJsonResponse(response, 'users.me.onboarding', isNull);
		const accessToken = requireBearerToken(response, 'users.me.onboarding');

		return { data: responseData, accessToken };
	});
};
