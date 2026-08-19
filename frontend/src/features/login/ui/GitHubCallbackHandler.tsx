'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { tokenProvider } from '@/features/auth/model/token-provider';
import { useAuth } from '@/features/auth/model/use-auth';
import { handleGitHubCallback } from '@/shared/api/auth/api';

export default function GitHubCallbackHandler() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const { setIsAuthenticated } = useAuth();
	const processed = useRef(false);

	useEffect(() => {
		if (processed.current) return;
		processed.current = true;

		const code = searchParams.get('code') || undefined;
		const state = searchParams.get('state') || undefined;
		const error = searchParams.get('error') || undefined;
		console.log(code, state, error);

		const processCallback = async () => {
			try {
				const response = await handleGitHubCallback({ code, state, error });
				const data = response?.data?.data;
				const accessToken = response?.accessToken;

				if (!data) {
					throw new Error('No data received');
				}

				if (accessToken) {
					tokenProvider.setAccessToken(accessToken);
					setIsAuthenticated(true);
				}

				if (data.onboardingStatus === 'PENDING') {
					router.replace('/sign-up');
				} else {
					const redirectUrl = localStorage.getItem('postLoginRedirect') || '/';
					localStorage.removeItem('postLoginRedirect');
					router.replace(redirectUrl);
				}
			} catch (err) {
				console.error('GitHub login failed:', err);
				router.replace('/');
			}
		};

		void processCallback();
	}, [searchParams, router, setIsAuthenticated]);

	return (
		<div className="flex min-h-screen items-center justify-center">
			<p className="text-body-1 text-text-secondary">로그인 처리 중입니다...</p>
		</div>
	);
}
