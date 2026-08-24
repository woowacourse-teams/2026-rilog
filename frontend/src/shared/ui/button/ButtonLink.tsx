import type { ButtonSize, ButtonVariant } from './button.styles';
import type { LinkProps } from 'next/link';
import type { ComponentPropsWithRef, ReactNode } from 'react';

import CustomLink from '@/shared/ui/link/CustomLink';

import { getButtonClassName } from './button.styles';

interface ButtonLinkProps extends LinkProps, Omit<ComponentPropsWithRef<'a'>, 'children' | 'href'> {
	children: ReactNode;
	variant?: ButtonVariant;
	size?: ButtonSize;
	fullWidth?: boolean;
}

export default function ButtonLink({
	children,
	className,
	fullWidth = false,
	size = 'md',
	variant = 'primary',
	...linkProps
}: ButtonLinkProps) {
	return (
		<CustomLink {...linkProps} className={getButtonClassName({ className, fullWidth, size, variant })}>
			{children}
		</CustomLink>
	);
}
