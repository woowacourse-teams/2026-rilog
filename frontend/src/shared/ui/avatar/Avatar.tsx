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
	const [failedSrc, setFailedSrc] = useState<string | null>(null);
	const isFailed = Boolean(src) && failedSrc === src;

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
					onError={() => setFailedSrc(src)}
				/>
			) : (
				fallback
			)}
		</span>
	);
}
