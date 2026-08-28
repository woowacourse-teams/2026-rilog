'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { getAnalyticsErrorProperties } from '@/features/analytics/lib/get-analytics-error-properties';
import { analytics } from '@/features/analytics/model/events';
import { clearSignUpFlow, startSignUpFlow } from '@/features/sign-up/lib/sign-up-flow-session';
import { handleGitHubCallback } from '@/shared/api/auth/api';
import { tokenManager } from '@/shared/api/auth/token-manager';
import { APP_ROUTES } from '@/shared/routes/app-routes';

export default function GitHubCallbackHandler() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const processed = useRef(false);

	useEffect(() => {
		if (processed.current) return;
		processed.current = true;

		const code = searchParams.get('code') || undefined;
		const state = searchParams.get('state') || undefined;
		const error = searchParams.get('error') || undefined;

		const processCallback = async () => {
			let failureStage = 'github_callback';

			try {
				const response = await handleGitHubCallback({ code, state, error });
				failureStage = 'response_validation';
				const data = response?.data?.data;
				const accessToken = response?.accessToken;

				if (!data) {
					throw new Error('No data received');
				}

				if (accessToken) {
					failureStage = 'session_publish';
					await tokenManager.publishLogin(accessToken);
				}
				analytics.githubLoginCompleted({
					userType: data.onboardingStatus === 'PENDING' ? 'new' : 'returning',
				});

				if (data.onboardingStatus === 'PENDING') {
					startSignUpFlow();
					router.replace(APP_ROUTES.signUp);
				} else {
					clearSignUpFlow();
					const redirectUrl = localStorage.getItem('postLoginRedirect') || '/';
					localStorage.removeItem('postLoginRedirect');
					router.replace(redirectUrl);
				}
			} catch (err) {
				const { errorCode } = getAnalyticsErrorProperties(err);
				analytics.githubLoginFailed({ failureStage, errorCode });
				clearSignUpFlow();
				console.error('GitHub login failed:', err);
				router.replace('/');
			}
		};

		void processCallback();
	}, [searchParams, router]);

	return (
		<div className="flex min-h-screen items-center justify-center">
			<p className="text-body-1 text-text-secondary">로그인 처리 중입니다...</p>
		</div>
	);
}
