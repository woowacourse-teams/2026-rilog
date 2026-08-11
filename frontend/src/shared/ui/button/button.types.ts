import type { ComponentPropsWithRef, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'github' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export type ButtonProps = Omit<ComponentPropsWithRef<'button'>, 'children'> & {
	children: ReactNode;
	variant?: ButtonVariant;
	size?: ButtonSize;
	isPending?: boolean;
};
