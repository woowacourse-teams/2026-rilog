'use client';

import type { ComponentProps, MouseEvent } from 'react';

import {
	isSameTabBlogProfileNavigation,
	recordBlogProfileEntryContext,
} from '@/features/analytics/lib/blog-profile-entry-context';
import type { BlogProfileEntrySource } from '@/features/analytics/model/analytics-event';
import CustomLink from '@/shared/ui/link/CustomLink';

type BlogProfileEntryLinkProps = Omit<ComponentProps<typeof CustomLink>, 'href' | 'onClick'> & {
	href: string;
	entrySource: BlogProfileEntrySource;
	onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export default function BlogProfileEntryLink({ href, entrySource, onClick, ...props }: BlogProfileEntryLinkProps) {
	const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
		onClick?.(event);

		if (event.defaultPrevented || !isSameTabBlogProfileNavigation(event)) {
			return;
		}

		recordBlogProfileEntryContext({ href, entrySource });
	};

	return <CustomLink href={href} onClick={handleClick} {...props} />;
}
