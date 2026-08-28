'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';

import UserAvatar from '@/domains/user/ui/UserAvatar';
import UserBlogLink from '@/domains/user/ui/UserBlogLink';
import { useAuth } from '@/features/auth/model/use-auth';
import { useAuthAction } from '@/features/login/model/use-auth-action';
import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';
import { APP_ROUTES } from '@/shared/routes/app-routes';
import Button from '@/shared/ui/button/Button';
import CustomLink from '@/shared/ui/link/CustomLink';

import { mapMyInfoResponse } from '../lib/map-my-info-response';

export default function MobileHeader() {
	const { isAuthenticated } = useAuth();
	const { data: user } = useMyInfoQuery({ isEnabled: isAuthenticated, select: mapMyInfoResponse });
	const pathname = usePathname() ?? '';
	const handleLoginClick = useAuthAction({ entrySurface: 'mobile_header' });
	const isFeedCurrent = pathname === APP_ROUTES.feeds || /^\/@[^/]+\/posts\//.test(pathname);
	const userAvatar = (
		<UserAvatar
			src={user?.profileImageUrl}
			fallback={user?.nickname.slice(0, 1).toUpperCase() ?? 'P'}
			label={user === null || user === undefined ? '사용자 프로필' : `${user.nickname} 프로필`}
			size="lg"
			hasBorder
		/>
	);
	const userProfileControl = user?.slug ? <UserBlogLink slug={user.slug}>{userAvatar}</UserBlogLink> : userAvatar;

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
				userProfileControl
			) : (
				<Button size="icon" variant="secondary" className="w-max rounded-full! px-4" onClick={handleLoginClick}>
					로그인
				</Button>
			)}
		</nav>
	);
}
