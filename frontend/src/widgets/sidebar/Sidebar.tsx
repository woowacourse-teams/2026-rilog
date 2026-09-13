'use client';

import { Suspense } from 'react';

import { useAuth } from '@/features/auth/model/use-auth';
import Divider from '@/shared/ui/divider/Divider';

import AuthenticatedSidebarFooter from './ui/AuthenticatedSidebarFooter';
import CologNavigation from './ui/CologNavigation';
import GuestSidebarFooter from './ui/GuestSidebarFooter';
import PageNavigation from './ui/PageNavigation';
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

				{isAuthenticated ? <AuthenticatedSidebarFooter /> : <GuestSidebarFooter />}
			</aside>
		</>
	);
}
