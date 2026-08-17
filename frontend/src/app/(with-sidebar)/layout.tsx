import type { ReactNode } from 'react';

import Sidebar from '@/widgets/sidebar/Sidebar';
import MobileHeader from '@/widgets/sidebar/ui/MobileHeader';

export default function SidebarLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<div className="min-h-dvh bg-background">
			<div className="sticky top-0 z-40 sm:hidden">
				<MobileHeader />
			</div>
			<div className="hidden sm:flex">
				<Sidebar />
			</div>
			<div className="min-h-dvh sm:pl-17.5">{children}</div>
		</div>
	);
}
