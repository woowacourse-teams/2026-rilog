'use client';

import { useState } from 'react';

import type { ComponentPropsWithRef } from 'react';

import ResponsiveImage from '@/shared/ui/responsive-image/ResponsiveImage';

interface AvatarProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
	fallback: string;
	hasBorder?: boolean;
	label?: string;
	src?: string;
	sizes?: string;
}

export default function Avatar({
	className,
	fallback,
	hasBorder = true,
	label,
	src,
	sizes,
	...avatarProps
}: AvatarProps) {
	const [isFailed, setIsFailed] = useState(false);

	return (
		<span
			{...avatarProps}
			role={label === undefined ? undefined : 'img'}
			aria-hidden={label === undefined ? true : undefined}
			aria-label={label}
			className={`inline-flex shrink-0 items-center justify-center ${hasBorder ? 'border border-border-default' : ''} ${className ?? ''}`.trim()}
		>
			{src && !isFailed ? (
				<ResponsiveImage
					src={src}
					alt=""
					sizes={sizes}
					className="size-full rounded-[inherit] object-cover"
					onError={() => setIsFailed(true)}
				/>
			) : (
				fallback
			)}
		</span>
	);
}
