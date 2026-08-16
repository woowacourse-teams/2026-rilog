import type { ReactNode } from 'react';

interface PageShellProps {
	header?: ReactNode;
	leftAside?: ReactNode;
	rightAside?: ReactNode;
	fullHeaderWidth?: boolean;
	isViewportConstrained?: boolean;
	children: ReactNode;
}

export default function PageShell({
	header,
	leftAside,
	rightAside,
	fullHeaderWidth = false,
	isViewportConstrained = false,
	children,
}: PageShellProps) {
	const hasLeftAside = leftAside != null;
	const hasRightAside = rightAside != null;
	const hasAside = hasLeftAside || hasRightAside;
	const pageClassName = [
		'page-shell flex w-full flex-col',
		isViewportConstrained ? 'h-dvh overflow-hidden' : 'min-h-screen',
	]
		.filter(Boolean)
		.join(' ');
	const headerClassName = `page-shell-header ${fullHeaderWidth ? 'page-shell-header-full' : ''}`.trim();
	const contentClassName = ['page-shell-content flex-1', isViewportConstrained && 'min-h-0'].filter(Boolean).join(' ');

	return (
		<div className={pageClassName}>
			<header className={headerClassName} data-has-aside={hasAside}>
				{header}
			</header>
			<div className={contentClassName} data-has-aside={hasAside}>
				{hasLeftAside && <aside className="page-shell-aside page-shell-aside-left">{leftAside}</aside>}
				<main className={`page-shell-main ${isViewportConstrained ? 'min-h-0 overflow-hidden' : ''}`}>{children}</main>
				{hasRightAside && <aside className="page-shell-aside page-shell-aside-right">{rightAside}</aside>}
			</div>
		</div>
	);
}
