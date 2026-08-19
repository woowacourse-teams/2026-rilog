import type { AuthResponse, GitHubCallbackParams } from './types';

import { apiClient } from '@/shared/api/client';
import type { ApiResponse } from '@/shared/api/shared.types';

export const handleGitHubCallback = async (params: GitHubCallbackParams) => {
	return await apiClient.post<ApiResponse<AuthResponse>>('v1/auth/github/callback', {
		json: params,
	});
};
