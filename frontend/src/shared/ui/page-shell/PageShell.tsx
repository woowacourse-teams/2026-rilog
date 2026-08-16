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
	const pageClassName = ['flex w-full flex-col', isViewportConstrained ? 'h-dvh overflow-hidden' : 'min-h-screen']
		.filter(Boolean)
		.join(' ');
	const constrainedWidthClassName = [
		'mx-auto w-full max-w-[768px]',
		hasRightAside && 'aside-right:max-w-[1032px]',
		hasLeftAside && !hasRightAside && 'aside-both:max-w-[1032px]',
		hasLeftAside && hasRightAside && 'aside-both:max-w-[1296px]',
	]
		.filter(Boolean)
		.join(' ');
	const headerClassName = fullHeaderWidth ? 'w-full' : constrainedWidthClassName;
	const contentClassName = [
		constrainedWidthClassName,
		'grid flex-1 grid-cols-[minmax(0,768px)]',
		isViewportConstrained && 'min-h-0',
		hasRightAside && 'aside-right:grid-cols-[768px_200px] aside-right:gap-x-16',
		hasLeftAside &&
			(hasRightAside
				? 'aside-both:grid-cols-[200px_768px_200px]'
				: 'aside-both:grid-cols-[200px_768px] aside-both:gap-x-16'),
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={pageClassName}>
			<header className={headerClassName}>{header}</header>
			<div className={contentClassName}>
				{hasLeftAside && <aside className="hidden aside-both:block">{leftAside}</aside>}
				<main className={`min-w-0 ${isViewportConstrained ? 'min-h-0 overflow-hidden' : ''}`}>{children}</main>
				{hasRightAside && <aside className="hidden aside-right:block">{rightAside}</aside>}
			</div>
		</div>
	);
}
