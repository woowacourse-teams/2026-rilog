export type AuthTokenType = 'access' | 'onboarding';
export type AuthLogoutReason = 'explicit' | 'refresh-failed';

export interface GitHubCallbackParams {
	code?: string;
	state?: string;
	error?: string;
}

export interface AuthResponse {
	onboardingStatus: 'PENDING' | 'COMPLETED';
	redirectUrl: string;
}

export type PluginConnectionEnvironment = 'develop' | 'production';

export interface PluginConnectionProfile {
	id: number;
	nickname: string;
	slug: string;
}

export interface PluginConnectionCredentials {
	accessToken: string;
	profile: PluginConnectionProfile;
	expiresAt: string;
}

export type PluginConnectionErrorCode =
	'LOGIN_REQUIRED' | 'ADMIN_REQUIRED' | 'ACCOUNT_CHANGED' | 'INVALID_RESPONSE' | 'API_UNAVAILABLE';
