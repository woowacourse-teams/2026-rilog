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
