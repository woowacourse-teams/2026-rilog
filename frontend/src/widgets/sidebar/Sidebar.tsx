import Divider from '@/shared/ui/divider/Divider';

import AuthenticatedSidebarFooter from './ui/AuthenticatedSidebarFooter';
import CologNavigation from './ui/CologNavigation';
import GuestSidebarFooter from './ui/GuestSidebarFooter';
import PageNavigation from './ui/PageNavigation';
import SidebarHeader from './ui/SidebarHeader';

interface SidebarProps {
	isAuthenticated?: boolean;
}

export default function Sidebar({ isAuthenticated }: SidebarProps) {
	return (
		<aside
			aria-label="사이드바"
			className="group fixed inset-y-0 left-0 z-40 flex h-dvh w-17.5 flex-col border-r border-border-default bg-surface transition-[width] duration-200 ease-out focus-within:w-60 hover:w-60"
		>
			<SidebarHeader />

			<div className="min-h-0 w-full flex-1 overflow-y-auto px-3 pb-4">
				<PageNavigation />
				{isAuthenticated && (
					<>
						<Divider className="my-4" />
						<CologNavigation />
					</>
				)}
			</div>

			{isAuthenticated ? <AuthenticatedSidebarFooter /> : <GuestSidebarFooter />}
		</aside>
	);
}
