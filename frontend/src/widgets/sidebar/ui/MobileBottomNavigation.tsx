'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import UserAvatar from '@/domains/user/ui/UserAvatar';
import { useAuthAction } from '@/features/login/model/use-auth-action';
import FeedIcon from '@/widgets/sidebar/assets/feed.svg';
import LogInIcon from '@/widgets/sidebar/assets/log-in.svg';
import WriteIcon from '@/widgets/sidebar/assets/write.svg';

interface MobileBottomNavigationProps {
	isAuthenticated?: boolean;
}

const ITEM_CLASS_NAME =
	'flex h-16 w-full min-w-16 flex-col items-center justify-center gap-1 rounded-lg text-caption-1 font-semibold transition-colors hover:bg-surface-hover active:bg-surface-active focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-focus-ring';

export default function MobileBottomNavigation({ isAuthenticated = false }: MobileBottomNavigationProps) {
	const pathname = usePathname() ?? '';
	const handleLoginClick = useAuthAction({ isAuthenticated });
	const isFeedCurrent = pathname === '/feeds' || pathname.startsWith('/posts/');
	const isWriteCurrent = pathname === '/write';
	const isProfileCurrent = pathname === '/profile';

	return (
		<nav
			aria-label="모바일 주요 메뉴"
			data-mobile-bottom-navigation
			className="fixed inset-x-0 bottom-0 z-40 border-t border-border-default bg-surface pb-[env(safe-area-inset-bottom)]"
		>
			<ul className="mx-auto flex h-16 max-w-md items-stretch px-2">
				<li className="flex-1">
					<Link
						href="/feeds"
						aria-current={isFeedCurrent ? 'page' : undefined}
						className={`${ITEM_CLASS_NAME} ${isFeedCurrent ? 'text-brand-primary' : 'text-text-secondary'}`}
					>
						<FeedIcon aria-hidden="true" focusable="false" className="size-8 shrink-0 p-1" />
						<span>피드</span>
					</Link>
				</li>

				<li className="flex-1">
					<Link
						href="/write"
						aria-current={isWriteCurrent ? 'page' : undefined}
						className={`${ITEM_CLASS_NAME} ${isWriteCurrent ? 'text-brand-primary' : 'text-text-secondary'}`}
					>
						<span className="flex size-8 items-center justify-center rounded-full bg-brand-primary text-on-brand-primary">
							<WriteIcon aria-hidden="true" focusable="false" className="size-5 shrink-0" />
						</span>
						<span>글쓰기</span>
					</Link>
				</li>

				<li className="flex-1">
					{isAuthenticated ? (
						<Link
							href="/profile"
							aria-current={isProfileCurrent ? 'page' : undefined}
							className={`${ITEM_CLASS_NAME} ${isProfileCurrent ? 'text-brand-primary' : 'text-text-secondary'}`}
						>
							<UserAvatar fallback="P" size="md" />
							<span>프로필</span>
						</Link>
					) : (
						<button type="button" className={`${ITEM_CLASS_NAME} text-text-secondary`} onClick={handleLoginClick}>
							<LogInIcon aria-hidden="true" focusable="false" className="size-8 shrink-0 p-1" />
							<span>로그인</span>
						</button>
					)}
				</li>
			</ul>
		</nav>
	);
}
