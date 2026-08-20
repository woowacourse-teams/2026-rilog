import ky from 'ky';

type LogoutListener = () => void;

class TokenManager {
	private accessToken: string | null = null;
	private refreshPromise: Promise<string | null> | null = null;
	private logoutListeners = new Set<LogoutListener>();

	constructor() {
		if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_DEV_MASTER_TOKEN) {
			this.accessToken = process.env.NEXT_PUBLIC_DEV_MASTER_TOKEN;
		}
	}

	getToken(): string | null {
		return this.accessToken;
	}

	setToken(token: string) {
		this.accessToken = token;
	}

	clearToken() {
		this.accessToken = null;
	}

	async refresh(): Promise<string | null> {
		if (this.refreshPromise) {
			return this.refreshPromise;
		}

		this.refreshPromise = this.executeRefresh().finally(() => {
			this.refreshPromise = null;
		});

		return this.refreshPromise;
	}

	private async executeRefresh(): Promise<string | null> {
		const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '') || '';

		try {
			// 순환 참조(Circular Dependency) 방지를 위해 범용 API 클라이언트(kyInstance) 대신 순수 ky 사용
			const response = await ky.post(`${baseUrl}/v1/auth/token/refresh`, {
				credentials: 'include',
				throwHttpErrors: false,
			});

			if (response.ok) {
				const authHeader = response.headers.get('Authorization');
				const token = authHeader ? authHeader.replace('Bearer ', '') : null;
				
				if (token) {
					this.setToken(token);
					return token;
				}
			}
		} catch (error) {
			console.error('[TokenManager] Failed to refresh token:', error);
		}

		// 재발급 실패 시 토큰을 비우고 로그아웃 이벤트를 발행하여 앱 전체를 로그아웃 상태로 전환
		this.clearToken();
		this.publishLogout();
		return null;
	}

	subscribeLogout(listener: LogoutListener) {
		this.logoutListeners.add(listener);
		return () => {
			this.logoutListeners.delete(listener);
		};
	}

	publishLogout() {
		this.logoutListeners.forEach((listener) => listener());
	}
}

export const tokenManager = new TokenManager();
