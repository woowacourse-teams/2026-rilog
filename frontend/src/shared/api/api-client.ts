import { createApiClient } from './create-api-client';

type TokenRefreshFailureListener = () => void;

const tokenRefreshFailureListeners = new Set<TokenRefreshFailureListener>();

const publishTokenRefreshFailure = () => {
	tokenRefreshFailureListeners.forEach((listener) => {
		listener();
	});
};

export const subscribeTokenRefreshFailure = (listener: TokenRefreshFailureListener) => {
	tokenRefreshFailureListeners.add(listener);

	return () => {
		tokenRefreshFailureListeners.delete(listener);
	};
};

// TODO: 로그인 api 연동 후 tokenProvider 추가
export const apiClient = createApiClient({
	baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
	onTokenRefreshFailure: publishTokenRefreshFailure,
});
