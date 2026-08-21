import type { LinkProps } from 'next/link';
import type { ComponentPropsWithRef, ReactNode } from 'react';

import CustomLink from '@/shared/ui/link/CustomLink';

type SidebarNavigationLinkSize = 'sm' | 'md';

interface SidebarNavigationLinkProps
	extends LinkProps, Omit<ComponentPropsWithRef<'a'>, 'aria-current' | 'children' | 'href'> {
	accessibilityLabel?: string;
	badge?: ReactNode;
	icon: ReactNode;
	isCurrent?: boolean;
	label: string;
	size?: SidebarNavigationLinkSize;
}

const SIZE_CLASS_NAMES: Record<SidebarNavigationLinkSize, string> = {
	sm: 'h-10 px-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary active:bg-surface-active',
	md: 'h-11 px-3.5',
};

const COLLAPSED_LABEL_CLASS_NAME = 'hidden min-w-0 whitespace-nowrap group-hover:block';
const FOCUS_CLASS_NAME = 'focus-visible:outline-2 focus-visible:outline-focus-ring focus-visible:outline-focus-ring';

export default function SidebarNavigationLink({
	accessibilityLabel,
	badge,
	className,
	icon,
	isCurrent = false,
	label,
	size = 'sm',
	...linkProps
}: SidebarNavigationLinkProps) {
	return (
		<CustomLink
			{...linkProps}
			aria-label={accessibilityLabel ?? label}
			aria-current={isCurrent ? 'page' : undefined}
			className={`flex w-full items-center justify-center gap-3 rounded-lg text-label-2 transition-colors duration-200 group-hover:justify-start ${SIZE_CLASS_NAMES[size]} ${isCurrent ? 'bg-navy-100 text-brand-primary hover:bg-navy-50 active:bg-navy-200' : ''} ${FOCUS_CLASS_NAME} ${className ?? ''}`.trim()}
		>
			{icon}
			<span className={`truncate font-semibold ${COLLAPSED_LABEL_CLASS_NAME}`}>{label}</span>
			{badge !== undefined && (
				<span
					className={`ml-auto rounded-full bg-surface px-2 py-0.5 text-caption-1 font-semibold text-text-secondary ${COLLAPSED_LABEL_CLASS_NAME}`}
				>
					{badge}
				</span>
			)}
		</CustomLink>
	);
}
