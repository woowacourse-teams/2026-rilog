import ky from 'ky';

import type { Hooks, KyInstance, Options } from 'ky';

import type { ErrorDetail } from '@/shared/api/shared.types';

import { isErrorDetail } from './api-error';
import { API_ERROR_CODES } from './error-codes';

interface TokenProvider {
	getAccessToken: () => string | null;
	refreshAccessToken: () => Promise<string | null>;
}

interface CreateKyInstanceOptions extends Omit<Options, 'hooks'> {
	hooks?: Hooks;
	onTokenRefreshFailure?: () => void;
	tokenProvider?: TokenProvider;
}

const ANONYMOUS_TOKEN_PROVIDER: TokenProvider = {
	getAccessToken: () => null,
	refreshAccessToken: () => Promise.resolve(null),
};

const isBrowser = () => typeof window !== 'undefined';

const readErrorDetail = async (response: Response): Promise<ErrorDetail | null> => {
	try {
		const body: unknown = await response.json();
		return isErrorDetail(body) ? body : null;
	} catch {
		return null;
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
	onTokenRefreshFailure,
	retry,
	tokenProvider = ANONYMOUS_TOKEN_PROVIDER,
	...options
}: CreateKyInstanceOptions = {}): KyInstance => {
	let refreshPromise: Promise<string | null> | null = null;

	const refreshAccessToken = () => {
		if (refreshPromise !== null) {
			return refreshPromise;
		}

		const currentRefreshPromise = tokenProvider
			.refreshAccessToken()
			.then((accessToken) => {
				if (accessToken === null) {
					onTokenRefreshFailure?.();
				}

				return accessToken;
			})
			.finally(() => {
				refreshPromise = null;
			});

		refreshPromise = currentRefreshPromise;

		return currentRefreshPromise;
	};

	return ky.create({
		...options,
		retry: ensureRefreshRetry(retry),
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
				({ request }) => {
					if (!isBrowser()) {
						return;
					}

					const accessToken = tokenProvider.getAccessToken();

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
				async ({ request, response, retryCount }) => {
					if (!isBrowser() || response.status !== 401) {
						return;
					}

					if (retryCount > 0) {
						onTokenRefreshFailure?.();
						return;
					}

					const errorDetail = await readErrorDetail(response.clone());
					if (errorDetail?.errorCode !== API_ERROR_CODES.EXPIRED_ACCESS_TOKEN) {
						return;
					}

					// 만료된 access token에 한해 클라이언트에서 한 번만 재발급 후 재시도한다.
					const accessToken = await refreshAccessToken();

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
