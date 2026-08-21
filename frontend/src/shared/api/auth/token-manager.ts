import ky from 'ky';

type AuthListener = () => void | Promise<void>;

class TokenManager {
	private accessToken: string | null = null;
	private refreshPromise: Promise<string | null> | null = null;
	private loginListeners = new Set<AuthListener>();
	private logoutListeners = new Set<AuthListener>();

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
		await this.publishLogout();
		return null;
	}

	subscribeLogin(listener: AuthListener) {
		this.loginListeners.add(listener);
		return () => {
			this.loginListeners.delete(listener);
		};
	}

	async publishLogin(token: string): Promise<void> {
		this.setToken(token);
		await this.notifyListeners(this.loginListeners);
	}

	subscribeLogout(listener: AuthListener) {
		this.logoutListeners.add(listener);
		return () => {
			this.logoutListeners.delete(listener);
		};
	}

	async publishLogout(): Promise<void> {
		this.accessToken = null;
		await this.notifyListeners(this.logoutListeners);
	}

	private async notifyListeners(listeners: Set<AuthListener>): Promise<void> {
		const results = await Promise.allSettled(
			Array.from(listeners, (listener) => Promise.resolve().then(() => listener())),
		);

		results.forEach((result) => {
			if (result.status === 'rejected') {
				console.error('[TokenManager] Auth listener failed:', result.reason);
			}
		});
	}
}

export const tokenManager = new TokenManager();
