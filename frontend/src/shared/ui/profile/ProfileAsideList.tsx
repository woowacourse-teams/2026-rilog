import type { ReactNode } from 'react';

interface ProfileAsideListProps {
	title: string;
	isEmpty: boolean;
	emptyMessage: string;
	children: ReactNode;
}

export default function ProfileAsideList({ title, isEmpty, emptyMessage, children }: ProfileAsideListProps) {
	return (
		<section aria-label={title}>
			<h2 className="text-label-2 font-semibold text-text-primary">{title}</h2>
			{isEmpty ? (
				<p className="mt-4 text-label-2 font-medium text-text-secondary">{emptyMessage}</p>
			) : (
				<ul className="mt-4 flex w-full flex-wrap gap-1 [&>li]:shrink-0">{children}</ul>
			)}
		</section>
	);
}
