import type { ButtonSize, ButtonVariant } from './button.styles';
import type { ComponentPropsWithRef, ReactNode } from 'react';

import { getButtonClassName } from './button.styles';

interface ButtonProps extends Omit<ComponentPropsWithRef<'button'>, 'children'> {
	children: ReactNode;
	variant?: ButtonVariant;
	size?: ButtonSize;
	isPending?: boolean;
	fullWidth?: boolean;
}

export default function Button({
	children,
	className,
	disabled = false,
	isPending = false,
	ref,
	size = 'md',
	type = 'button',
	variant = 'primary',
	fullWidth = false,
	'aria-busy': ariaBusy,
	...buttonProps
}: ButtonProps) {
	return (
		<button
			{...buttonProps}
			ref={ref}
			type={type}
			className={getButtonClassName({ className, fullWidth, size, variant })}
			disabled={disabled || isPending}
			aria-busy={isPending ? true : ariaBusy}
		>
			{children}
		</button>
	);
}
