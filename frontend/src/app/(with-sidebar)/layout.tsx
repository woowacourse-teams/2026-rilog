import type { ReactNode } from 'react';

import Sidebar from '@/widgets/sidebar/Sidebar';
import MobileBottomNavigation from '@/widgets/sidebar/ui/MobileBottomNavigation';

export default function SidebarLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<div className="min-h-dvh bg-background">
			<div className="hidden sm:flex">
				<Sidebar />
			</div>
			<div className="min-h-dvh sm:pl-17.5">{children}</div>
			<div className="sm:hidden">
				<MobileBottomNavigation />
			</div>
		</div>
	);
}
