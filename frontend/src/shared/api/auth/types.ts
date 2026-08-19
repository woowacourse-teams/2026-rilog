export interface GitHubCallbackParams {
	code?: string;
	state?: string;
	error?: string;
}

export interface AuthResponse {
	onboardingStatus: 'PENDING' | 'COMPLETED';
	redirectUrl: string;
}
