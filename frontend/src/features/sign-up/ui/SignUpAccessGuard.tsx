'use client';

import { type ReactNode, useEffect, useSyncExternalStore } from 'react';

import AccessFeedback from '@/features/auth/ui/AccessFeedback';
import { tokenManager } from '@/shared/api/auth/token-manager';
import { APP_ROUTES } from '@/shared/routes/app-routes';

import {
	clearSignUpFlow,
	getServerSignUpFlowStatus,
	getSignUpFlowStatus,
	initializeSignUpFlowStatus,
	subscribeSignUpFlow,
} from '../lib/sign-up-flow-session';

interface SignUpAccessGuardProps {
	children: ReactNode;
}

export default function SignUpAccessGuard({ children }: SignUpAccessGuardProps) {
	const signUpFlowStatus = useSyncExternalStore(subscribeSignUpFlow, getSignUpFlowStatus, getServerSignUpFlowStatus);

	useEffect(() => {
		initializeSignUpFlowStatus();
		return tokenManager.subscribeLogout(clearSignUpFlow);
	}, []);

	if (signUpFlowStatus === 'checking') {
		return (
			<div className="flex min-h-screen items-center justify-center" role="status">
				<p className="text-body-1 text-text-secondary">회원가입 접근 권한을 확인하고 있습니다...</p>
			</div>
		);
	}

	if (signUpFlowStatus === 'denied') {
		return <AccessFeedback isOpen reason="sign-up-unavailable" redirectPath={APP_ROUTES.feeds} />;
	}

	return children;
}
