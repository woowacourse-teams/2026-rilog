import type { ComponentPropsWithRef, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'github' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

type ButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
	children: ReactNode;
	variant?: ButtonVariant;
	size?: ButtonSize;
	isPending?: boolean;
};

const BASE_BUTTON_CLASS_NAME =
	'inline-flex items-center justify-center gap-2 text-label-2 font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring disabled:cursor-not-allowed disabled:opacity-btn-disabled';

const SIZE_CLASS_NAMES: Record<ButtonSize, string> = {
	sm: 'h-btn-height-sm rounded-md px-btn-inline-sm',
	md: 'h-btn-height-md rounded-md px-btn-inline-md',
	lg: 'h-btn-height-lg rounded-lg px-btn-inline-lg',
	icon: 'size-10 shrink-0 rounded-lg',
};

const VARIANT_CLASS_NAMES: Record<ButtonVariant, string> = {
	primary: 'bg-btn-primary text-btn-primary-foreground hover:bg-btn-primary-hover active:bg-btn-primary-active',
	secondary:
		'border border-btn-cancel-border bg-btn-cancel text-btn-cancel-foreground hover:bg-btn-cancel-hover active:bg-btn-cancel-active',
	danger: 'bg-btn-delete text-btn-delete-foreground hover:bg-btn-delete-hover active:bg-btn-delete-active',
	success: 'bg-btn-approve text-btn-approve-foreground hover:bg-btn-approve-hover active:bg-btn-approve-active',
	github: 'bg-btn-github text-btn-github-foreground hover:bg-btn-github-hover active:bg-btn-github-active',
	ghost: 'text-text-secondary hover:bg-surface-hover active:bg-surface-active',
};

export default function Button({
	children,
	className,
	disabled = false,
	isPending = false,
	ref,
	size = 'md',
	type = 'button',
	variant = 'primary',
	'aria-busy': ariaBusy,
	...buttonProps
}: ButtonProps) {
	return (
		<button
			{...buttonProps}
			ref={ref}
			type={type}
			className={`${BASE_BUTTON_CLASS_NAME} ${SIZE_CLASS_NAMES[size]} ${VARIANT_CLASS_NAMES[variant]} ${className ?? ''}`.trim()}
			disabled={disabled || isPending}
			aria-busy={isPending ? true : ariaBusy}
		>
			{children}
		</button>
	);
}
