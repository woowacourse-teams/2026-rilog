'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';

import type { User } from '@/domains/user/model/user';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import UserBlogLink from '@/domains/user/ui/UserBlogLink';
import { useAuth } from '@/features/auth/model/use-auth';
import { useAuthAction } from '@/features/login/model/use-auth-action';
import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';
import { APP_ROUTES } from '@/shared/routes/app-routes';
import Button from '@/shared/ui/button/Button';
import ButtonLink from '@/shared/ui/button/ButtonLink';
import CustomLink from '@/shared/ui/link/CustomLink';
import NotificationUnreadIcon from '@/widgets/sidebar/assets/notification-unread.svg';

import { mapMyInfoResponse } from '../lib/map-my-info-response';

function UserProfile({ user }: { user: User | null | undefined }) {
	const userAvatar = (
		<UserAvatar
			src={user?.profileImageUrl}
			fallback={user?.nickname.slice(0, 1).toUpperCase() ?? 'P'}
			label={user === null || user === undefined ? '사용자 프로필' : `${user.nickname} 프로필`}
			size="lg"
			hasBorder
		/>
	);

	return user?.slug ? <UserBlogLink slug={user.slug}>{userAvatar}</UserBlogLink> : userAvatar;
}

export default function MobileHeader() {
	const { isAuthenticated } = useAuth();
	const { data: user } = useMyInfoQuery({ isEnabled: isAuthenticated, select: mapMyInfoResponse });

	const pathname = usePathname() ?? '';
	const isFeedCurrent = pathname === APP_ROUTES.feeds || /^\/@[^/]+\/posts\//.test(pathname);

	const handleLoginClick = useAuthAction({ entrySurface: 'mobile_header' });

	return (
		<nav
			aria-label="모바일 주요 메뉴"
			data-mobile-header
			className="flex h-16 w-full items-center justify-between border-b border-border-default bg-white px-5"
		>
			<CustomLink href={APP_ROUTES.feeds} aria-current={isFeedCurrent ? 'page' : undefined}>
				<Image src="/brand/logo.svg" alt="Rilog." width={85} height={34} priority />
			</CustomLink>

			{isAuthenticated ? (
				<div className="flex items-center gap-2">
					<ButtonLink
						href={APP_ROUTES.notifications}
						aria-label="알림"
						aria-current={pathname === APP_ROUTES.notifications ? 'page' : undefined}
						size="icon"
						variant="ghost"
					>
						<NotificationUnreadIcon width={24} height={24} aria-hidden="true" focusable="false" />
					</ButtonLink>
					<UserProfile user={user} />
				</div>
			) : (
				<Button size="icon" variant="secondary" className="w-max rounded-full! px-4" onClick={handleLoginClick}>
					로그인
				</Button>
			)}
		</nav>
	);
}
