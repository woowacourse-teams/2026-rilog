'use client';

import type { ComponentProps, MouseEvent } from 'react';

import type { AboutPageEntrySource } from '@/features/analytics/model/analytics-event';
import { analytics } from '@/features/analytics/model/events';
import { APP_ROUTES } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';

type AboutPageEntryLinkProps = Omit<ComponentProps<typeof CustomLink>, 'href'> & {
	entrySource: AboutPageEntrySource;
};

export default function AboutPageEntryLink({ entrySource, onClick, ...props }: AboutPageEntryLinkProps) {
	const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
		onClick?.(event);
		analytics.aboutPageEntryClicked({ entrySource });
	};

	return <CustomLink href={APP_ROUTES.about} onClick={handleClick} {...props} />;
}
