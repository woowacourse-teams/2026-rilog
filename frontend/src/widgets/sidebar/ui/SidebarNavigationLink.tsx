import type { LinkProps } from 'next/link';
import type { ComponentPropsWithRef, ReactNode } from 'react';

import CustomLink from '@/shared/ui/link/CustomLink';

import { EXPANDED_TEXT_CLASS_NAME, FOCUS_CLASS_NAME } from './sidebar-class-names';

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
	sm: 'h-10 w-full px-1 text-text-secondary hover:bg-surface-hover hover:text-text-primary active:bg-surface-active',
	md: 'mx-1.25 h-8.75 w-[calc(100%-10px)] text-text-secondary hover:bg-navy-50 hover:text-brand-primary active:bg-navy-200',
};

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
			className={`flex items-center gap-2 overflow-hidden rounded-lg text-label-2 transition-colors duration-200 ${SIZE_CLASS_NAMES[size]} ${isCurrent ? 'bg-navy-100 text-brand-primary! hover:bg-navy-100 active:bg-navy-200' : ''} ${FOCUS_CLASS_NAME} ${className ?? ''}`.trim()}
		>
			<span className="flex size-8.75 shrink-0 items-center justify-center">{icon}</span>
			<span className={`truncate font-semibold ${EXPANDED_TEXT_CLASS_NAME}`}>{label}</span>
			{badge !== undefined && (
				<span
					className={`mr-2 ml-auto rounded-full bg-surface px-2 py-0.5 text-caption-1 font-semibold text-text-secondary ${EXPANDED_TEXT_CLASS_NAME}`}
				>
					{badge}
				</span>
			)}
		</CustomLink>
	);
}
