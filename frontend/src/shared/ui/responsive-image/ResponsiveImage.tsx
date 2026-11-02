/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useRef, useState } from 'react';

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
	const imgRef = useRef<HTMLImageElement>(null);
	const checkedFailedSrcRef = useRef<string | null>(null);
	const useRaw = rawFallbackSrc === src;

	const srcset = useRaw ? undefined : toSrcSet(src);

	const handleError = (event: SyntheticEvent<HTMLImageElement, Event>) => {
		if (!useRaw && srcset !== undefined) {
			setRawFallbackSrc(src);
			return;
		}

		onError?.(event);
	};

	useEffect(() => {
		const image = imgRef.current;
		if (image === null || checkedFailedSrcRef.current === src || !image.complete || image.naturalWidth !== 0) {
			return;
		}

		checkedFailedSrcRef.current = src;
		if (image.hasAttribute('srcset')) {
			setRawFallbackSrc(src);
		} else {
			image.dispatchEvent(new Event('error'));
		}
	}, [src]);

	const computedLoading = loading ?? (priority ? 'eager' : 'lazy');
	const computedFetchPriority = fetchPriority ?? (priority ? 'high' : 'auto');
	const computedClassName = fill ? `absolute inset-0 size-full ${className ?? ''}`.trim() : className;

	return (
		<img
			ref={imgRef}
			{...imgProps}
			src={src}
			srcSet={srcset}
			sizes={srcset !== undefined ? sizes : undefined}
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
