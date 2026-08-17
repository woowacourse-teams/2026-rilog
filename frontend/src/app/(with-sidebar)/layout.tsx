import type { ReactNode } from 'react';

import Sidebar from '@/widgets/sidebar/Sidebar';

export default function SidebarLAyout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<div className="min-h-dvh bg-background">
			<Sidebar />
			<div className="min-h-dvh pl-17.5">{children}</div>
		</div>
	);
}
