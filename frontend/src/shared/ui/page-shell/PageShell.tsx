import type { ReactNode } from 'react';

interface PageShellProps {
	header?: ReactNode;
	leftAside?: ReactNode;
	rightAside?: ReactNode;
	children: ReactNode;
}

export default function PageShell({ header, leftAside, rightAside, children }: PageShellProps) {
	const hasLeftAside = leftAside != null;
	const hasRightAside = rightAside != null;
	const shellClassName = [
		'mx-auto flex min-h-screen w-full max-w-[768px] flex-col',
		hasRightAside && 'aside-right:w-fit aside-right:max-w-none',
		hasLeftAside && !hasRightAside && 'aside-both:w-fit aside-both:max-w-none',
	]
		.filter(Boolean)
		.join(' ');
	const gridClassName = [
		'grid flex-1 grid-cols-[minmax(0,768px)]',
		hasRightAside && 'aside-right:grid-cols-[768px_200px] aside-right:gap-x-16',
		hasLeftAside &&
			(hasRightAside
				? 'aside-both:grid-cols-[200px_768px_200px]'
				: 'aside-both:grid-cols-[200px_768px] aside-both:gap-x-16'),
	]
		.filter(Boolean)
		.join(' ');

	return (
		<div className={shellClassName}>
			<header>{header}</header>
			<div className={gridClassName}>
				{hasLeftAside && <aside className="hidden aside-both:block">{leftAside}</aside>}
				<main className="min-w-0">{children}</main>
				{hasRightAside && <aside className="hidden aside-right:block">{rightAside}</aside>}
			</div>
		</div>
	);
}
