'use client';

import { useEffect, useRef } from 'react';

import { useAuth } from '@/features/auth/model/use-auth';
import { tokenManager } from '@/shared/api/auth/token-manager';
import { registerPostView } from '@/shared/api/posts/api';
import { apiErrorReporter } from '@/shared/error-tracking/api-error-reporter-instance';

interface PostViewRegistrationProps {
	postId: number;
}

export default function PostViewRegistration({ postId }: PostViewRegistrationProps) {
	const { isInitialized, isOnboarding, sessionVersion } = useAuth();
	const visitRef = useRef({ postId, attempted: false, didPageHide: false });

	useEffect(() => {
		if (visitRef.current.postId !== postId) {
			visitRef.current = { postId, attempted: false, didPageHide: false };
		}
		const visit = visitRef.current;
		const register = () => {
			if (!isInitialized || isOnboarding || sessionVersion !== tokenManager.getSessionVersion() || visit.attempted)
				return;
			// Keep this flag across effect cleanup, auth changes and failures in the same visit.
			visit.attempted = true;
			void registerPostView(postId).catch((error: unknown) => {
				apiErrorReporter.report(error, { operation: 'post.view.register' });
			});
		};
		const handlePageHide = () => {
			visit.didPageHide = true;
		};
		const handlePageShow = (event: PageTransitionEvent) => {
			if (!visit.didPageHide || !event.persisted) return;
			visit.didPageHide = false;
			visit.attempted = false;
			register();
		};
		register();
		window.addEventListener('pagehide', handlePageHide);
		window.addEventListener('pageshow', handlePageShow);
		return () => {
			window.removeEventListener('pagehide', handlePageHide);
			window.removeEventListener('pageshow', handlePageShow);
		};
	}, [isInitialized, isOnboarding, postId, sessionVersion]);

	return null;
}
