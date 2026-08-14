import type { ReactNode } from 'react';

interface PageShellProps {
	header?: ReactNode;
	leftAside?: ReactNode;
	rightAside?: ReactNode;
	children: ReactNode;
}

export default function PageShell({ header, leftAside, rightAside, children }: PageShellProps) {
	return (
		<div className="mx-auto flex min-h-screen w-full max-w-[768px] flex-col aside-right:w-fit aside-right:max-w-none">
			<header>{header}</header>
			<div className="grid flex-1 grid-cols-[minmax(0,768px)] aside-right:grid-cols-[768px_200px] aside-right:gap-x-16 aside-both:grid-cols-[200px_768px_200px]">
				<aside className="hidden aside-both:block">{leftAside}</aside>
				<main className="min-w-0">{children}</main>
				<aside className="hidden aside-right:block">{rightAside}</aside>
			</div>
		</div>
	);
}
