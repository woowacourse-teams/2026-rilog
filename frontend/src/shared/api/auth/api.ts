import type { AuthResponse, GitHubCallbackParams } from './types';

import { apiRequest, kyInstance } from '@/shared/api/client';
import { isRecord, parseApiJsonResponse } from '@/shared/api/response-validation';

import { requireBearerToken } from './authorization-header';

const isAuthResponse = (value: unknown): value is AuthResponse =>
	isRecord(value) &&
	(value.onboardingStatus === 'PENDING' || value.onboardingStatus === 'COMPLETED') &&
	typeof value.redirectUrl === 'string';

export const handleGitHubCallback = async (params: GitHubCallbackParams) => {
	return apiRequest(async () => {
		const response = await kyInstance.post('v1/auth/github/callback', {
			json: params,
		});
		const data = await parseApiJsonResponse(response, 'auth.github.callback', isAuthResponse);
		const accessToken = requireBearerToken(response, 'auth.github.callback');

		return { data, accessToken };
	});
};

export const logoutAuth = async () => {
	return await apiRequest(() =>
		kyInstance.post('v1/auth/logout', {
			credentials: 'include',
		}),
	);
};
