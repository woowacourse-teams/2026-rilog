import { createApiClient } from './create-api-client';

export const apiClient = createApiClient({
	baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
});
