import Link from 'next/link';

import type { ButtonSize, ButtonVariant } from './button.styles';
import type { LinkProps } from 'next/link';
import type { ComponentPropsWithRef, ReactNode } from 'react';

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
		<Link {...linkProps} className={getButtonClassName({ className, fullWidth, size, variant })}>
			{children}
		</Link>
	);
}
