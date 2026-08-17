import type { ReactNode } from 'react';

interface PageShellProps {
	header?: ReactNode;
	leftAside?: ReactNode;
	rightAside?: ReactNode;
	fullHeaderWidth?: boolean;
	isHeaderSticky?: boolean;
	children: ReactNode;
}

export default function PageShell({
	header,
	leftAside,
	rightAside,
	fullHeaderWidth = false,
	isHeaderSticky = false,
	children,
}: PageShellProps) {
	const hasLeftAside = leftAside != null;
	const hasRightAside = rightAside != null;
	const hasAside = hasLeftAside || hasRightAside;
	const pageClassName = ['page-shell flex w-full flex-col'].filter(Boolean).join(' ');
	const headerClassName = [
		'page-shell-header',
		fullHeaderWidth && 'page-shell-header-full',
		isHeaderSticky && 'page-shell-header-sticky',
	]
		.filter(Boolean)
		.join(' ');
	const contentClassName = ['page-shell-content flex-1'].filter(Boolean).join(' ');

	return (
		<div className={pageClassName}>
			<header className={headerClassName} data-has-aside={hasAside}>
				{header}
			</header>
			<div className={contentClassName} data-has-aside={hasAside}>
				{hasLeftAside && <aside className="page-shell-aside page-shell-aside-left">{leftAside}</aside>}
				<main className="page-shell-main">{children}</main>
				{hasRightAside && <aside className="page-shell-aside page-shell-aside-right">{rightAside}</aside>}
			</div>
		</div>
	);
}
