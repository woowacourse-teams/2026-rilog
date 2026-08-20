import { tokenProvider } from '@/features/auth/model/token-provider';

import { normalizeApiError } from './api-error';
import { createKyInstance } from './create-ky-instance';

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

// TODO: 로그인 api 연동 후 tokenProvider 실제 구현으로 교체
export const kyInstance = createKyInstance({
	baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
	credentials: 'include',
	onTokenRefreshFailure: publishTokenRefreshFailure,
	tokenProvider,
});

/**
 * 범용 API 요청 wrapper
 * 넘겨받은 프로미스(fn)를 실행하고, 발생한 에러를 NormalizedApiError 형태로 변환해 던집니다.
 *
 * @example
 * // JSON이 아닌 예외 케이스 (blob, text 등)
 * const blob = await apiRequest(() => kyInstance.get(`teams/${id}/report`).blob());
 */
export const apiRequest = async <T>(fn: () => Promise<T>): Promise<T> => {
	try {
		return await fn();
	} catch (error) {
		// eslint-disable-next-line @typescript-eslint/only-throw-error
		throw normalizeApiError(error);
	}
};

/**
 * JSON 응답 전용 HTTP 클라이언트 wrapper
 * 각 HTTP 메서드를 호출한 뒤 자동으로 .json<T>() 파싱을 수행하고 에러를 정규화합니다.
 *
 * @example
 * // JSON 응답의 일반적인 경우
 * const team = await apiClient.get<Team>(`teams/${id}`);
 */

export const apiClient = {
	get: <T>(url: string, options?: Parameters<typeof kyInstance.get>[1]) =>
		apiRequest(() => kyInstance.get(url, options).json<T>()),
	post: <T>(url: string, options?: Parameters<typeof kyInstance.post>[1]) =>
		apiRequest(() => kyInstance.post(url, options).json<T>()),
	put: <T>(url: string, options?: Parameters<typeof kyInstance.put>[1]) =>
		apiRequest(() => kyInstance.put(url, options).json<T>()),
	delete: <T>(url: string, options?: Parameters<typeof kyInstance.delete>[1]) =>
		apiRequest(() => kyInstance.delete(url, options).json<T>()),
};
