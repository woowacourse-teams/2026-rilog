import type { ReactNode } from 'react';

import FooterShell from '@/widgets/app-shell/FooterShell';

export default function FooterShellLayout({ children }: Readonly<{ children: ReactNode }>) {
	return <FooterShell>{children}</FooterShell>;
}
