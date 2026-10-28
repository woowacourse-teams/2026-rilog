import type {
	AuthResponse,
	GitHubCallbackParams,
	PluginConnectionCredentials,
	PluginConnectionEnvironment,
	PluginConnectionErrorCode,
	PluginConnectionProfile,
} from './types';

import { apiRequest, kyInstance } from '@/shared/api/client';
import { createKyInstance } from '@/shared/api/create-ky-instance';
import { rememberApiRequest } from '@/shared/api/request-diagnostics';
import { isRecord, parseApiJsonResponse } from '@/shared/api/response-validation';
import { apiErrorReporter } from '@/shared/error-tracking/api-error-reporter-instance';

import { parseBearerToken, requireBearerToken } from './authorization-header';
import { tokenManager } from './token-manager';

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

export class PluginConnectionError extends Error {
	constructor(
		readonly code: PluginConnectionErrorCode,
		message: string,
	) {
		super(message);
		this.name = 'PluginConnectionError';
	}
}

const API_BASE_BY_ENVIRONMENT: Record<PluginConnectionEnvironment, string> = {
	develop: 'https://develop.rilog.kr',
	production: 'https://api.rilog.kr',
};

export const getPluginConnectionApiBase = (environment: PluginConnectionEnvironment): string =>
	API_BASE_BY_ENVIRONMENT[environment];

const isProfile = (value: unknown): value is PluginConnectionProfile =>
	isRecord(value) &&
	typeof value.id === 'number' &&
	Number.isSafeInteger(value.id) &&
	value.id > 0 &&
	typeof value.nickname === 'string' &&
	typeof value.slug === 'string' &&
	value.slug.length > 0;

const claimsFromToken = (token: string): Record<string, unknown> => {
	try {
		const parts = token.split('.');
		if (parts.length !== 3 || parts.some((part) => part.length === 0)) throw new Error();
		const segment = parts[1].replace(/-/g, '+').replace(/_/g, '/');
		const bytes = Uint8Array.from(atob(segment.padEnd(Math.ceil(segment.length / 4) * 4, '=')), (value) =>
			value.charCodeAt(0),
		);
		const claims: unknown = JSON.parse(new TextDecoder().decode(bytes));
		if (!isRecord(claims)) throw new Error();
		return claims;
	} catch {
		throw new PluginConnectionError('INVALID_RESPONSE', 'Rilog 인증 응답을 확인하지 못했습니다. 다시 로그인해 주세요.');
	}
};

const safeFailure = (error: unknown): PluginConnectionError => {
	if (error instanceof PluginConnectionError) return error;
	const response = isRecord(error) && error.response instanceof Response ? error.response : null;
	if (response?.status === 401) return new PluginConnectionError('LOGIN_REQUIRED', 'Rilog에 먼저 로그인해 주세요.');
	if (response?.status === 403)
		return new PluginConnectionError('ADMIN_REQUIRED', '이 계정에는 관리자 권한이 없습니다.');
	return new PluginConnectionError('API_UNAVAILABLE', 'Rilog 서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.');
};

/** Shares same-environment refresh flights; foreign-environment credentials stay isolated. */
export async function refreshPluginConnection(
	environment: PluginConnectionEnvironment,
): Promise<PluginConnectionCredentials> {
	const apiBase = getPluginConnectionApiBase(environment);
	const client = createKyInstance({ baseUrl: apiBase, retry: { limit: 0, methods: [] }, timeout: 10_000 });
	let method = 'POST';
	let url = `${apiBase}/v1/auth/token/refresh`;
	try {
		let accessToken: string | null;
		if (process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, '') === apiBase) {
			// AuthProvider may already be rotating this cookie. Reuse its single flight.
			accessToken = await tokenManager.refresh();
			if (accessToken === null) throw new PluginConnectionError('LOGIN_REQUIRED', 'Rilog에 먼저 로그인해 주세요.');
		} else {
			const refreshed = await client.post('v1/auth/token/refresh', { credentials: 'include' });
			accessToken = parseBearerToken(refreshed.headers.get('Authorization'));
			if (accessToken === null)
				throw new PluginConnectionError('INVALID_RESPONSE', 'Rilog 인증 응답이 올바르지 않습니다.');
		}
		const claims = claimsFromToken(accessToken);
		if (
			claims.tokenType !== 'ACCESS' ||
			typeof claims.exp !== 'number' ||
			!Number.isFinite(claims.exp) ||
			claims.exp * 1000 <= Date.now()
		) {
			throw new PluginConnectionError('LOGIN_REQUIRED', 'Rilog 인증이 만료되었습니다. 다시 로그인해 주세요.');
		}
		if (claims.role !== 'ADMIN') {
			throw new PluginConnectionError('ADMIN_REQUIRED', '이 계정에는 관리자 권한이 없습니다.');
		}
		method = 'GET';
		url = `${apiBase}/v1/users/me`;
		const response = await client.get('v1/users/me', {
			credentials: 'omit',
			headers: { Authorization: `Bearer ${accessToken}` },
		});
		const { data: profile } = await parseApiJsonResponse(response, 'auth.plugin.connection.profile', isProfile);
		if (claims.userId !== profile.id) {
			throw new PluginConnectionError('INVALID_RESPONSE', 'Rilog 인증 사용자 정보가 일치하지 않습니다.');
		}
		return { accessToken, profile, expiresAt: new Date(claims.exp * 1000).toISOString() };
	} catch (error) {
		const failure = safeFailure(error);
		// Report only the public operation and a sanitized error. Original errors may contain credentials.
		if (failure.code !== 'LOGIN_REQUIRED' && failure.code !== 'ADMIN_REQUIRED') {
			rememberApiRequest(failure, method, url, apiBase);
			apiErrorReporter.report(failure, { operation: 'auth.plugin.connection' });
		}
		throw failure;
	}
}
