'use client';

import type { ReactNode } from 'react';

import type { BlogType } from '@/domains/blog/model/blog';
import AccessFeedback from '@/features/auth/ui/AccessFeedback';
import { useSettingsAccess } from '@/features/settings-access/hooks/use-settings-access';
import { buildBlogHomePath } from '@/shared/routes/app-routes';
import ButtonLink from '@/shared/ui/button/ButtonLink';

interface SettingsAccessGuardProps {
	children: ReactNode;
	type: BlogType;
	slug: string;
}

export default function SettingsAccessGuard({ children, type, slug }: SettingsAccessGuardProps) {
	const accessStatus = useSettingsAccess({ type, slug });
	const homePath = buildBlogHomePath(slug);

	if (accessStatus === 'authorized') {
		return children;
	}

	if (accessStatus === 'unauthenticated' || accessStatus === 'forbidden') {
		return (
			<AccessFeedback
				isOpen
				reason={accessStatus === 'unauthenticated' ? 'auth-required' : 'forbidden'}
				redirectPath={homePath}
			/>
		);
	}

	if (accessStatus === 'error') {
		return (
			<div className="flex min-h-80 flex-col items-center justify-center gap-4 px-6 text-center" role="alert">
				<p className="text-body-1 text-danger-text">설정 접근 권한을 확인하지 못했습니다.</p>
				<ButtonLink href={homePath} variant="secondary">
					블로그 홈으로 돌아가기
				</ButtonLink>
			</div>
		);
	}

	return (
		<div
			className="flex min-h-80 items-center justify-center px-6 text-body-1 text-text-secondary"
			role="status"
			aria-label="설정 접근 권한 확인 중"
		>
			설정 접근 권한을 확인하고 있습니다.
		</div>
	);
}
