/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';

import type { ComponentPropsWithoutRef, SyntheticEvent } from 'react';

import { toSrcSet } from '@/shared/lib/image';

interface ResponsiveImageProps extends ComponentPropsWithoutRef<'img'> {
	src: string;
	alt: string;
	sizes?: string;
	fill?: boolean;
	priority?: boolean;
}

export default function ResponsiveImage({
	src,
	alt,
	sizes = '100vw',
	fill = false,
	priority = false,
	className,
	style,
	loading,
	fetchPriority,
	decoding = 'async',
	onError,
	...imgProps
}: ResponsiveImageProps) {
	const [rawFallbackSrc, setRawFallbackSrc] = useState<string | null>(null);
	const useRaw = rawFallbackSrc === src;

	const srcset = useRaw ? undefined : toSrcSet(src);

	const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
		if (!useRaw && srcset !== undefined) {
			setRawFallbackSrc(src);
			return;
		}

		onError?.(event);
	};

	const computedLoading = loading ?? (priority ? 'eager' : 'lazy');
	const computedFetchPriority = fetchPriority ?? (priority ? 'high' : 'auto');
	const computedClassName = fill ? `absolute inset-0 size-full ${className ?? ''}`.trim() : className;

	return (
		<img
			{...imgProps}
			src={src}
			srcSet={srcset}
			sizes={sizes}
			alt={alt}
			loading={computedLoading}
			fetchPriority={computedFetchPriority}
			decoding={decoding}
			className={computedClassName}
			style={style}
			onError={handleError}
		/>
	);
}
