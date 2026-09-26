import ky from 'ky';

import type { AuthLogoutReason, AuthTokenType } from './types';

import { apiErrorReporter } from '@/shared/error-tracking/api-error-reporter-instance';
import { logNonProductionError } from '@/shared/utils/non-production-console';

type AuthListener = () => void | Promise<void>;
type LogoutListener = (reason: AuthLogoutReason) => void | Promise<void>;

class TokenManager {
	private accessToken: string | null = null;
	private tokenType: AuthTokenType = 'access';
	private refreshPromise: Promise<string | null> | null = null;
	// 로그인·온보딩·로그아웃 전이만 증가시킨다. 같은 세션의 토큰 갱신은 버전을 유지한다.
	private sessionVersion = 0;
	private refreshSessionVersion = 0;
	private loginListeners = new Set<AuthListener>();
	private onboardingListeners = new Set<AuthListener>();
	private logoutListeners = new Set<LogoutListener>();

	constructor() {
		if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEV_MASTER_TOKEN) {
			this.accessToken = process.env.NEXT_PUBLIC_DEV_MASTER_TOKEN;
		}
	}

	getToken(): string | null {
		return this.accessToken;
	}

	getTokenType(): AuthTokenType | null {
		return this.accessToken === null ? null : this.tokenType;
	}

	getSessionVersion(): number {
		return this.sessionVersion;
	}

	setToken(token: string, tokenType: AuthTokenType = 'access') {
		this.accessToken = token;
		this.tokenType = tokenType;
	}

	async refresh(): Promise<string | null> {
		if (this.refreshPromise && this.refreshSessionVersion === this.sessionVersion) {
			return this.refreshPromise;
		}

		this.refreshSessionVersion = this.sessionVersion;
		const refreshPromise = this.executeRefresh(this.sessionVersion).finally(() => {
			if (this.refreshPromise === refreshPromise) this.refreshPromise = null;
		});
		this.refreshPromise = refreshPromise;

		return this.refreshPromise;
	}

	private async executeRefresh(sessionVersion: number): Promise<string | null> {
		const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || '';

		try {
			// 순환 참조(Circular Dependency) 방지를 위해 범용 API 클라이언트(kyInstance) 대신 순수 ky 사용
			const response = await ky.post(`${baseUrl}/v1/auth/token/refresh`, {
				credentials: 'include',
			});

			// 이전 세션의 요청을 새 계정의 토큰으로 재시도하지 않는다.
			if (sessionVersion !== this.sessionVersion) return null;

			if (response.ok) {
				const authHeader = response.headers.get('Authorization');
				const token = authHeader ? authHeader.replace('Bearer ', '') : null;

				if (token) {
					this.setToken(token);
					return token;
				}
			}
		} catch (error) {
			if (sessionVersion !== this.sessionVersion) return null;
			apiErrorReporter.report(error, { operation: 'auth.refresh' });
			logNonProductionError('[TokenManager] Failed to refresh token:', error);
		}

		// 재발급 실패 시 토큰을 비우고 로그아웃 이벤트를 발행하여 앱 전체를 로그아웃 상태로 전환
		if (sessionVersion !== this.sessionVersion) return null;
		await this.publishLogout('refresh-failed');
		return null;
	}

	subscribeLogin(listener: AuthListener) {
		this.loginListeners.add(listener);
		return () => {
			this.loginListeners.delete(listener);
		};
	}

	async publishLogin(token: string): Promise<void> {
		this.sessionVersion += 1;
		this.setToken(token);
		await this.notifyListeners(this.loginListeners);
	}

	subscribeOnboarding(listener: AuthListener) {
		this.onboardingListeners.add(listener);
		return () => {
			this.onboardingListeners.delete(listener);
		};
	}

	async publishOnboarding(token: string): Promise<void> {
		this.sessionVersion += 1;
		this.setToken(token, 'onboarding');
		await this.notifyListeners(this.onboardingListeners);
	}

	subscribeLogout(listener: LogoutListener) {
		this.logoutListeners.add(listener);
		return () => {
			this.logoutListeners.delete(listener);
		};
	}

	async publishLogout(reason: AuthLogoutReason = 'explicit'): Promise<void> {
		this.sessionVersion += 1;
		this.accessToken = null;
		await this.notifyListeners(Array.from(this.logoutListeners, (listener) => () => listener(reason)));
	}

	private async notifyListeners(listeners: Iterable<AuthListener>): Promise<void> {
		// 구독자는 이벤트가 발생한 세션에서 즉시 시작한다. 비동기 완료는 각 구독자가 검증한다.
		const results = await Promise.allSettled(Array.from(listeners, async (listener) => listener()));

		results.forEach((result) => {
			if (result.status === 'rejected') {
				logNonProductionError('[TokenManager] Auth listener failed:', result.reason);
			}
		});
	}
}

export const tokenManager = new TokenManager();
