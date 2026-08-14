import type { ComponentPropsWithRef } from 'react';

interface AvatarProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
	fallback: string;
	hasBorder?: boolean;
	label?: string;
}

export default function Avatar({ className, fallback, hasBorder = false, label, ...avatarProps }: AvatarProps) {
	return (
		<span
			{...avatarProps}
			role={label === undefined ? undefined : 'img'}
			aria-hidden={label === undefined ? true : undefined}
			aria-label={label}
			className={`inline-flex shrink-0 items-center justify-center ${hasBorder ? 'border border-border-default' : ''} ${className ?? ''}`.trim()}
		>
			{fallback}
		</span>
	);
}
