import type { ComponentPropsWithoutRef, ReactNode } from 'react';

import ResponsiveImage from '@/shared/ui/responsive-image/ResponsiveImage';

type ImagePreviewShape = 'circle' | 'square' | 'rectangle';
type ImagePreviewFit = 'cover' | 'contain';
type ImagePreviewStatus = 'default' | 'error';

interface ImagePreviewProps extends Omit<ComponentPropsWithoutRef<'img'>, 'alt' | 'className' | 'src'> {
	alt: string;
	src?: string;
	shape?: ImagePreviewShape;
	fit?: ImagePreviewFit;
	status?: ImagePreviewStatus;
	fallback?: ReactNode;
	className?: string;
	imageClassName?: string;
}

const SHAPE_CLASS_NAMES: Record<ImagePreviewShape, string> = {
	circle: 'aspect-square rounded-full',
	square: 'aspect-square rounded-lg',
	rectangle: 'aspect-[3/1] rounded-lg',
};

const FIT_CLASS_NAMES: Record<ImagePreviewFit, string> = {
	cover: 'object-cover',
	contain: 'object-contain',
};

const STATUS_CLASS_NAMES: Record<ImagePreviewStatus, string> = {
	default: 'border-border-default',
	error: 'border-danger',
};

export default function ImagePreview({
	alt,
	src,
	shape = 'square',
	fit = 'cover',
	status = 'default',
	fallback,
	className,
	imageClassName,
	sizes = '100vw',
	...imageProps
}: ImagePreviewProps) {
	return (
		<div
			className={`relative overflow-hidden border bg-surface ${STATUS_CLASS_NAMES[status]} ${SHAPE_CLASS_NAMES[shape]} ${className ?? ''}`.trim()}
		>
			{src ? (
				<ResponsiveImage
					{...imageProps}
					fill
					src={src}
					alt={alt}
					sizes={sizes}
					className={`${FIT_CLASS_NAMES[fit]} ${imageClassName ?? ''}`.trim()}
				/>
			) : (
				fallback
			)}
		</div>
	);
}
