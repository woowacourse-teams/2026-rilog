'use client';

import { Suspense } from 'react';

import AboutPageEntryLink from '@/features/analytics/ui/AboutPageEntryLink';
import { useAuth } from '@/features/auth/model/use-auth';
import Divider from '@/shared/ui/divider/Divider';

import AuthenticatedSidebarFooter from './ui/AuthenticatedSidebarFooter';
import CologNavigation from './ui/CologNavigation';
import GuestSidebarFooter from './ui/GuestSidebarFooter';
import PageNavigation from './ui/PageNavigation';
import { EXPANDED_TEXT_CLASS_NAME, FOCUS_CLASS_NAME } from './ui/sidebar-class-names';
import SidebarHeader from './ui/SidebarHeader';

export default function Sidebar() {
	const { isAuthenticated } = useAuth();

	return (
		<>
			<aside
				aria-label="사이드바"
				className="group fixed inset-y-0 left-0 z-40 flex h-dvh w-15 flex-col overflow-hidden border-r border-border-default bg-surface transition-[width] duration-200 ease-out hover:w-60 motion-reduce:transition-none"
			>
				<SidebarHeader />

				<div className="min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto px-1.75 pb-4">
					<Suspense fallback={null}>
						<PageNavigation />
					</Suspense>
					{isAuthenticated && (
						<>
							<Divider className="my-4" />
							<CologNavigation />
						</>
					)}
				</div>

				<nav aria-label="Rilog 정보" className="flex w-56.25 shrink-0 flex-col items-start gap-1 px-2.25 py-3">
					<AboutPageEntryLink
						entrySource="sidebar"
						target="_blank"
						className={`rounded-lg px-2.5 py-1 text-caption-1 font-medium whitespace-nowrap text-text-secondary hover:text-focus-ring active:text-focus-ring ${FOCUS_CLASS_NAME}`}
					>
						<span className={EXPANDED_TEXT_CLASS_NAME}>Rilog. 이야기 ↗</span>
					</AboutPageEntryLink>
					<a
						href="mailto:rilog.admin@gmail.com"
						className={`rounded-lg px-2.5 py-1 text-caption-1 font-medium whitespace-nowrap text-text-secondary hover:text-focus-ring active:text-focus-ring ${FOCUS_CLASS_NAME}`}
					>
						<span className={EXPANDED_TEXT_CLASS_NAME}>rilog.admin@gmail.com</span>
					</a>
				</nav>

				{isAuthenticated ? <AuthenticatedSidebarFooter /> : <GuestSidebarFooter />}
			</aside>
		</>
	);
}
