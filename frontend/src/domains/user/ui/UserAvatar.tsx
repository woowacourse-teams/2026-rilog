import type { ComponentPropsWithRef } from 'react';

import Avatar from '@/shared/ui/avatar/Avatar';
import { getImageUrl } from '@/shared/utils/get-image-url';

type UserAvatarSize = 'sm' | 'md' | 'lg';
type UserAvatarTone = 'subtle' | 'strong';

interface UserAvatarProps extends Omit<ComponentPropsWithRef<typeof Avatar>, 'src'> {
	size?: UserAvatarSize;
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

export default function UserAvatar({ className, size = 'md', tone = 'strong', src, ...avatarProps }: UserAvatarProps) {
	return (
		<Avatar
			{...avatarProps}
			src={getImageUrl(src) || undefined}
			className={`font-bold ${SIZE_CLASS_NAMES[size]} ${TONE_CLASS_NAMES[tone]} ${className ?? ''}`.trim()}
		/>
	);
}
