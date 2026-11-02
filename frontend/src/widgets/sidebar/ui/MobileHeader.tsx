'use client';

import Image from 'next/image';
import { usePathname } from 'next/navigation';

import { useAuth } from '@/features/auth/model/use-auth';
import { useAuthAction } from '@/features/login/model/use-auth-action';
import { useNotificationUnreadCountQuery } from '@/shared/api/notifications/queries/unread-count/use-query';
import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';
import { APP_ROUTES } from '@/shared/routes/app-routes';
import Button from '@/shared/ui/button/Button';
import ButtonLink from '@/shared/ui/button/ButtonLink';
import CustomLink from '@/shared/ui/link/CustomLink';
import MagazineIcon from '@/widgets/sidebar/assets/magazine.svg';
import NotificationUnreadIcon from '@/widgets/sidebar/assets/notification-unread.svg';
import NotificationIcon from '@/widgets/sidebar/assets/notification.svg';

import { mapMyInfoResponse } from '../lib/map-my-info-response';

import MobileProfileMenu from './MobileProfileMenu';

export default function MobileHeader() {
	const { isAuthenticated } = useAuth();
	const { data: user } = useMyInfoQuery({ isEnabled: isAuthenticated, select: mapMyInfoResponse });
	const unreadCount = useNotificationUnreadCountQuery().data?.data?.unreadCount ?? 0;

	const pathname = usePathname() ?? '';
	const isFeedCurrent = pathname === APP_ROUTES.feeds || /^\/@[^/]+\/posts\//.test(pathname);
	const isMagazineCurrent = pathname === APP_ROUTES.theRilog || pathname.startsWith(`${APP_ROUTES.theRilog}/`);

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
			<div className="flex items-center gap-2">
				<CustomLink
					href={APP_ROUTES.theRilog}
					aria-label="The Rilog."
					aria-current={isMagazineCurrent ? 'page' : undefined}
					className="flex size-11 items-center justify-center rounded-md text-text-secondary transition-colors hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring aria-[current=page]:text-brand-primary"
				>
					<MagazineIcon aria-hidden="true" focusable="false" className="size-6" />
				</CustomLink>
				{isAuthenticated ? (
					<>
						<ButtonLink
							href={APP_ROUTES.notifications}
							aria-label={unreadCount > 0 ? `알림, 읽지 않은 알림 ${unreadCount}개` : '알림'}
							aria-current={pathname === APP_ROUTES.notifications ? 'page' : undefined}
							size="icon"
							variant="ghost"
						>
							{unreadCount > 0 ? (
								<NotificationUnreadIcon width={24} height={24} aria-hidden="true" focusable="false" />
							) : (
								<NotificationIcon width={24} height={24} aria-hidden="true" focusable="false" />
							)}
						</ButtonLink>
						<MobileProfileMenu user={user} />
					</>
				) : (
					<Button size="icon" variant="secondary" className="w-max rounded-full! px-4" onClick={handleLoginClick}>
						로그인
					</Button>
				)}
			</div>
		</nav>
	);
}
