import type { ComponentPropsWithRef } from 'react';

interface AvatarProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
	fallback: string;
	hasBorder?: boolean;
	label?: string;
	src?: string;
}

export default function Avatar({ className, fallback, hasBorder = true, label, src, ...avatarProps }: AvatarProps) {
	return (
		<span
			{...avatarProps}
			role={label === undefined ? undefined : 'img'}
			aria-hidden={label === undefined ? true : undefined}
			aria-label={label}
			className={`inline-flex shrink-0 items-center justify-center ${hasBorder ? 'border border-border-default' : ''} ${className ?? ''}`.trim()}
		>
			{src ? (
				<>
					{/* 추후 Image 태그로 교체 고려 */}
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={src} alt="" className="size-full rounded-[inherit] object-cover" />
				</>
			) : (
				fallback
			)}
		</span>
	);
}
