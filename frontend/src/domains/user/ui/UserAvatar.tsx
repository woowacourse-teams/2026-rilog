import type { ComponentPropsWithRef } from 'react';

import { buildBlogHomePath } from '@/shared/routes/app-routes';
import Avatar from '@/shared/ui/avatar/Avatar';
import CustomLink from '@/shared/ui/link/CustomLink';
import { getImageUrl } from '@/shared/utils/get-image-url';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

type UserAvatarSize = 'sm' | 'md' | 'lg';
type UserAvatarTone = 'subtle' | 'strong';

interface UserAvatarProps extends Omit<ComponentPropsWithRef<typeof Avatar>, 'src'> {
	size?: UserAvatarSize;
	slug?: string;
	tone?: UserAvatarTone;
	src?: string | null;
}

const SIZE_CLASS_NAMES: Record<UserAvatarSize, string> = {
	sm: 'size-6 rounded-full text-caption-1',
	md: 'size-8 rounded-full text-caption-2',
	lg: 'size-10 rounded-full text-caption-2',
};

const TONE_CLASS_NAMES: Record<UserAvatarTone, string> = {
	subtle: 'bg-navy-100 text-navy-700',
	strong: 'bg-navy-200 text-navy-800',
};

export default function UserAvatar({
	className,
	size = 'md',
	slug,
	tone = 'strong',
	src,
	...avatarProps
}: UserAvatarProps) {
	const avatar = (
		<Avatar
			{...avatarProps}
			src={getImageUrl(src) || undefined}
			className={`font-bold ${SIZE_CLASS_NAMES[size]} ${TONE_CLASS_NAMES[tone]} ${className ?? ''}`.trim()}
		/>
	);
	const normalizedSlug = slug === undefined ? '' : stripAtPrefix(slug);

	if (normalizedSlug === '') {
		return avatar;
	}

	return (
		<CustomLink
			href={buildBlogHomePath(normalizedSlug)}
			aria-label={`@${normalizedSlug} 블로그로 이동`}
			className="inline-flex rounded-full focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus-ring"
		>
			{avatar}
		</CustomLink>
	);
}
