import ky from 'ky';

import type { Hooks, KyInstance, Options } from 'ky';

import { API_ERROR_CODES } from './error-codes';

interface TokenManager {
	getToken: () => string | null;
	refresh: () => Promise<string | null>;
}

export interface RequestAuthOptions {
	skipAuth?: boolean;
}

interface CreateKyInstanceOptions extends Omit<Options, 'hooks'> {
	baseUrl?: string;
	hooks?: Hooks;
	tokenManager?: TokenManager;
}

const ANONYMOUS_TOKEN_MANAGER: TokenManager = {
	getToken: () => null,
	refresh: () => Promise.resolve(null),
};

const isBrowser = () => typeof window !== 'undefined';

const isExpiredTokenResponse = async (response: Response): Promise<boolean> => {
	try {
		const body: unknown = await response.json();
		return (
			typeof body === 'object' &&
			body !== null &&
			'errorCode' in body &&
			body.errorCode === API_ERROR_CODES.EXPIRED_ACCESS_TOKEN
		);
	} catch {
		return false;
	}
};

const ensureRefreshRetry = (retry: Options['retry']): Options['retry'] => {
	if (typeof retry === 'number') {
		return Math.max(1, retry);
	}

	if (retry === undefined) {
		return retry;
	}

	return {
		...retry,
		limit: Math.max(1, retry.limit ?? 2),
	};
};

export const createKyInstance = ({
	hooks,
	retry,
	tokenManager = ANONYMOUS_TOKEN_MANAGER,
	...options
}: CreateKyInstanceOptions = {}): KyInstance => {
	const resolvedBaseUrl = typeof options.baseUrl === 'string' ? options.baseUrl : undefined;
	const getApiBase = (): string | undefined => resolvedBaseUrl ?? process.env.NEXT_PUBLIC_API_BASE_URL;

	return ky.create({
		...options,
		retry: ensureRefreshRetry(retry),
		credentials: 'include',
		hooks: {
			...hooks,
			beforeError: [
				({ request, error }) => {
					console.error(`[ky error] ${request.method} ${request.url} - ${error.message}`);
					return error;
				},
				...(hooks?.beforeError ?? []),
			],
			beforeRequest: [
				({ request }) => {
					console.log(`[ky request] ${request.method} ${request.url}`);
				},
				({ request, options: requestOptions }) => {
					if (!isBrowser()) {
						return;
					}

					const skipAuth = Boolean((requestOptions as unknown as { skipAuth?: boolean } | undefined)?.skipAuth);
					if (skipAuth) {
						return;
					}

					const apiBase = getApiBase();
					if (apiBase && !request.url.startsWith(apiBase)) {
						return;
					}

					const accessToken = tokenManager.getToken();

					if (accessToken !== null) {
						request.headers.set('Authorization', `Bearer ${accessToken}`);
					}
				},
				...(hooks?.beforeRequest ?? []),
			],
			afterResponse: [
				({ request, response }) => {
					console.log(`[ky response] ${request.method} ${request.url} - ${response.status}`);
				},
				...(hooks?.afterResponse ?? []),
				async ({ request, response, retryCount, options: requestOptions }) => {
					if (!isBrowser() || response.status !== 401) {
						return;
					}

					const skipAuth = Boolean((requestOptions as unknown as { skipAuth?: boolean } | undefined)?.skipAuth);
					if (skipAuth) {
						return;
					}

					const apiBase = getApiBase();
					if (apiBase && !request.url.startsWith(apiBase)) {
						return;
					}

					if (retryCount > 0) {
						return;
					}

					const isExpiredToken = await isExpiredTokenResponse(response.clone());
					if (!isExpiredToken) {
						return;
					}

					// 만료된 access token에 한해 클라이언트에서 한 번만 재발급 후 재시도한다.
					// 중복 요청 방지 및 실패 시 로그아웃 처리는 tokenManager 내부에서 수행합니다.
					const accessToken = await tokenManager.refresh();

					if (accessToken === null) {
						return;
					}

					const headers = new Headers(request.headers);
					headers.set('Authorization', `Bearer ${accessToken}`);

					return ky.retry({
						code: 'TOKEN_REFRESHED',
						delay: 0,
						request: new Request(request, { headers }),
					});
				},
			],
		},
	});
};
