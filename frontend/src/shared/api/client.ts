import { tokenManager } from '@/shared/api/auth/token-manager';

import { normalizeApiError } from './api-error';
import { createKyInstance } from './create-ky-instance';
import { rememberApiRequest } from './request-diagnostics';

export const kyInstance = createKyInstance({
	baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
	credentials: 'include',
	tokenManager,
});

/**
 * 범용 API 요청 wrapper
 * 넘겨받은 프로미스(fn)를 실행하고, 발생한 에러를 NormalizedApiError 형태로 변환해 던집니다.
 *
 * @example
 * // JSON이 아닌 예외 케이스 (blob, text 등)
 * const blob = await apiRequest(() => kyInstance.get(`teams/${id}/report`).blob());
 */
export const apiRequest = async <T>(fn: () => Promise<T>, request?: { method: string; url: string }): Promise<T> => {
	try {
		return await fn();
	} catch (error) {
		const normalized = normalizeApiError(error);
		if (request)
			rememberApiRequest(normalized.cause, request.method, request.url, process.env.NEXT_PUBLIC_API_BASE_URL);
		// eslint-disable-next-line @typescript-eslint/only-throw-error
		throw normalized;
	}
};

/**
 * HTTP 클라이언트 wrapper
 * GET, POST, PUT, PATCH 응답은 자동으로 .json<T>() 파싱하고 에러를 정규화합니다.
 * DELETE는 항상 204 No Content 응답을 전제로 하며 JSON으로 파싱하지 않고 Response를 반환합니다.
 *
 * @example
 * // JSON 응답의 일반적인 경우
 * const team = await apiClient.get<Team>(`teams/${id}`);
 */

export const apiClient = {
	get: <T>(url: string, options?: Parameters<typeof kyInstance.get>[1]) =>
		apiRequest(() => kyInstance.get(url, options).json<T>(), { method: 'GET', url }),
	post: <T>(url: string, options?: Parameters<typeof kyInstance.post>[1]) =>
		apiRequest(() => kyInstance.post(url, options).json<T>(), { method: 'POST', url }),
	put: <T>(url: string, options?: Parameters<typeof kyInstance.put>[1]) =>
		apiRequest(() => kyInstance.put(url, options).json<T>(), { method: 'PUT', url }),
	patch: <T>(url: string, options?: Parameters<typeof kyInstance.put>[1]) =>
		apiRequest(() => kyInstance.patch(url, options).json<T>(), { method: 'PATCH', url }),
	delete: (url: string, options?: Parameters<typeof kyInstance.delete>[1]) =>
		apiRequest(() => kyInstance.delete(url, options), { method: 'DELETE', url }),
};
