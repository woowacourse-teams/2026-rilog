'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import UserAvatar from '@/domains/user/ui/UserAvatar';
import { useAuthAction } from '@/features/login/model/use-auth-action';
import Button from '@/shared/ui/button/Button';

interface MobileBottomNavigationProps {
	isAuthenticated?: boolean;
}

export default function MobileHeader({ isAuthenticated = false }: MobileBottomNavigationProps) {
	const pathname = usePathname() ?? '';
	const handleLoginClick = useAuthAction({ isAuthenticated });
	const isFeedCurrent = pathname === '/feeds' || pathname.startsWith('/posts/');

	return (
		<nav
			aria-label="모바일 주요 메뉴"
			data-mobile-header
			className="flex h-16 w-full items-center justify-between border-b border-border-default bg-white px-5"
		>
			<Link href="/feeds" aria-current={isFeedCurrent ? 'page' : undefined}>
				<Image src="/brand/logo.svg" alt="Rilog." width={85} height={32} priority />
			</Link>

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
