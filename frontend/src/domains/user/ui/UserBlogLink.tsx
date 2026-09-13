import type { MouseEventHandler, ReactNode } from 'react';

import { buildBlogHomePath } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

interface UserBlogLinkProps {
	children: ReactNode;
	slug: string;
	onClick?: MouseEventHandler<HTMLAnchorElement>;
}

export default function UserBlogLink({ children, slug, onClick }: UserBlogLinkProps) {
	const normalizedSlug = stripAtPrefix(slug);

	return (
		<CustomLink
			href={buildBlogHomePath(normalizedSlug)}
			aria-label={`@${normalizedSlug} 블로그로 이동`}
			onClick={onClick}
			className="inline-flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
		>
			{children}
		</CustomLink>
	);
}
