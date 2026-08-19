'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';

import UserAvatar from '@/domains/user/ui/UserAvatar';
import { useAuth } from '@/features/auth/model/use-auth';
import { useAuthAction } from '@/features/login/model/use-auth-action';
import { APP_ROUTES } from '@/shared/routes/app-routes';
import Button from '@/shared/ui/button/Button';
import CustomLink from '@/shared/ui/link/CustomLink';

export default function MobileHeader() {
	const { isAuthenticated } = useAuth();
	const pathname = usePathname() ?? '';
	const handleLoginClick = useAuthAction();
	const isFeedCurrent = pathname === APP_ROUTES.feeds || /^\/@[^/]+\/posts\//.test(pathname);

	return (
		<nav
			aria-label="모바일 주요 메뉴"
			data-mobile-header
			className="flex h-16 w-full items-center justify-between border-b border-border-default bg-white px-5"
		>
			<CustomLink href={APP_ROUTES.feeds} aria-current={isFeedCurrent ? 'page' : undefined}>
				<Image src="/brand/logo.svg" alt="Rilog." width={85} height={32} priority />
			</CustomLink>

			{isAuthenticated ? (
				<UserAvatar fallback="P" size="lg" hasBorder />
			) : (
				<Button size="icon" variant="secondary" className="w-max rounded-full! px-4" onClick={handleLoginClick}>
					로그인
				</Button>
			)}
		</nav>
	);
}
