'use client';

import type { ComponentProps, MouseEvent } from 'react';

import type { AboutPageLinkTarget } from '@/features/analytics/model/analytics-event';
import { analytics } from '@/features/analytics/model/events';
import CustomLink from '@/shared/ui/link/CustomLink';

type AboutPageLinkProps = Omit<ComponentProps<typeof CustomLink>, 'onClick'> & {
	linkTarget: AboutPageLinkTarget;
	onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
};

export default function AboutPageLink({ linkTarget, onClick, ...props }: AboutPageLinkProps) {
	const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
		onClick?.(event);
		analytics.aboutPageLinkClicked({ linkTarget });
	};

	return <CustomLink onClick={handleClick} {...props} />;
}
