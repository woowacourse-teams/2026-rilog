import type { ReactNode } from 'react';

import Footer from '@/widgets/footer/Footer';

export default function FooterLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<div className="flex min-h-dvh flex-col">
			<div className="flex-1 pb-25">{children}</div>
			<Footer />
		</div>
	);
}
