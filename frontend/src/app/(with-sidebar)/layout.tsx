import type { ReactNode } from 'react';

import SidebarShell from '@/widgets/app-shell/SidebarShell';

export default function SidebarShellLayout({ children }: Readonly<{ children: ReactNode }>) {
	return <SidebarShell>{children}</SidebarShell>;
}
