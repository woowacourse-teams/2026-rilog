import ky from 'ky';

import type { Hooks, KyInstance, Options } from 'ky';

type TokenProvider = {
	getAccessToken: () => string | null;
	refreshAccessToken: () => Promise<string | null>;
};

type CreateApiClientOptions = Omit<Options, 'hooks'> & {
	hooks?: Hooks;
	tokenProvider?: TokenProvider;
};

const ANONYMOUS_TOKEN_PROVIDER: TokenProvider = {
	getAccessToken: () => null,
	refreshAccessToken: () => Promise.resolve(null),
};

const isBrowser = () => typeof window !== 'undefined';

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

export const createApiClient = ({
	hooks,
	retry,
	tokenProvider = ANONYMOUS_TOKEN_PROVIDER,
	...options
}: CreateApiClientOptions = {}): KyInstance => {
	let refreshPromise: Promise<string | null> | null = null;

	const refreshAccessToken = () => {
		refreshPromise ??= tokenProvider.refreshAccessToken().finally(() => {
			refreshPromise = null;
		});

		return refreshPromise;
	};

	return ky.create({
		...options,
		retry: ensureRefreshRetry(retry),
		hooks: {
			...hooks,
			beforeRequest: [
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
				...(hooks?.afterResponse ?? []),
				async ({ request, response, retryCount }) => {
					if (!isBrowser() || response.status !== 401 || retryCount > 0) {
						return;
					}

					// 클라이언트 사이드에서 토큰 만료로 인한 첫 실패 시 토큰 재발급
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

export type { CreateApiClientOptions, TokenProvider };
