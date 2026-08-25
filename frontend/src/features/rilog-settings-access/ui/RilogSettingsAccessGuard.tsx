'use client';

import type { ReactNode } from 'react';

import AccessFeedback from '@/features/auth/ui/AccessFeedback';
import { useSettingsAccess } from '@/features/settings-access/hooks/use-settings-access';
import { buildBlogHomePath } from '@/shared/routes/app-routes';
import ButtonLink from '@/shared/ui/button/ButtonLink';

interface RilogSettingsAccessGuardProps {
	children: ReactNode;
	slug: string;
}

export default function RilogSettingsAccessGuard({ children, slug }: RilogSettingsAccessGuardProps) {
	const accessStatus = useSettingsAccess({ type: 'RILOG', slug });
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
				<p className="text-body-1 text-danger-text">개인 설정 접근 권한을 확인하지 못했습니다.</p>
				<ButtonLink href={homePath} variant="secondary">
					개인 블로그로 돌아가기
				</ButtonLink>
			</div>
		);
	}

	return (
		<div
			className="flex min-h-80 items-center justify-center px-6 text-body-1 text-text-secondary"
			role="status"
			aria-label="개인 설정 접근 권한 확인 중"
		>
			개인 설정 접근 권한을 확인하고 있습니다.
		</div>
	);
}
