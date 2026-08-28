import type { AuthResponse, GitHubCallbackParams } from './types';

import { apiRequest, kyInstance } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';

export const handleGitHubCallback = async (params: GitHubCallbackParams) => {
	const response = await apiRequest(() =>
		kyInstance.post('v1/auth/github/callback', {
			json: params,
		}),
	);

	const data = await response.json<ApiResponse<AuthResponse>>();
	const authorizationHeader = response.headers.get('Authorization');
	const accessToken = authorizationHeader ? authorizationHeader.replace('Bearer ', '') : null;

	return {
		data,
		accessToken,
	};
};

export const logoutAuth = async () => {
	return await apiRequest(() =>
		kyInstance.post('v1/auth/logout', {
			credentials: 'include',
		}),
	);
};
