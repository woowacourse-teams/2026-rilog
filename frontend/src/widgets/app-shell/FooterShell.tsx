import type { ReactNode } from 'react';

import Footer from '@/widgets/footer/Footer';

interface FooterShellProps {
	children: ReactNode;
}

export default function FooterShell({ children }: FooterShellProps) {
	return (
		<div className="flex min-h-dvh flex-col">
			<div className="flex-1">{children}</div>
			<Footer />
		</div>
	);
}
