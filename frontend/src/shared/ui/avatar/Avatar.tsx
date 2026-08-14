import type { ComponentPropsWithRef } from 'react';

interface AvatarProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
	fallback: string;
	hasBorder?: boolean;
	label?: string;
	src?: string;
}

export default function Avatar({ className, fallback, hasBorder = false, label, src, ...avatarProps }: AvatarProps) {
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
					{/* 프로필 이미지 URL은 임의의 외부 호스트 URL 가능 */}
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img src={src} alt="" className="size-full rounded-[inherit] object-cover" />
				</>
			) : (
				fallback
			)}
		</span>
	);
}
