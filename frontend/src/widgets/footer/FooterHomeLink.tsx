'use client';

import { usePathname } from 'next/navigation';

import type { ReactNode } from 'react';

import { APP_ROUTES } from '@/shared/routes/app-routes';
import { SITE_NAME } from '@/shared/seo/create-social-metadata';
import CustomLink from '@/shared/ui/link/CustomLink';

interface FooterHomeLinkProps {
	className: string;
	children: ReactNode;
}

export default function FooterHomeLink({ className, children }: FooterHomeLinkProps) {
	const pathname = usePathname();

	const handleNavigate = (event: { preventDefault: () => void }) => {
		if (pathname !== APP_ROUTES.feeds) return;
		event.preventDefault();

		window.scrollTo({
			top: 0,
			behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
		});
	};

	return (
		<CustomLink
			className={className}
			href={APP_ROUTES.feeds}
			aria-label={`${SITE_NAME} 홈`}
			onNavigate={handleNavigate}
		>
			{children}
		</CustomLink>
	);
}
