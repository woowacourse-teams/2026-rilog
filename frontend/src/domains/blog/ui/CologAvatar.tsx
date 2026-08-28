import type { ComponentPropsWithRef } from 'react';

import Avatar from '@/shared/ui/avatar/Avatar';
import { getImageUrl } from '@/shared/utils/get-image-url';

type CologAvatarSize = 'sm' | 'md' | 'lg' | 'max';
type CologAvatarTone = 'subtle' | 'strong';

interface CologAvatarProps extends ComponentPropsWithRef<typeof Avatar> {
	size?: CologAvatarSize;
	tone?: CologAvatarTone;
}

const SIZE_CLASS_NAMES: Record<CologAvatarSize, string> = {
	sm: 'size-6 rounded text-caption-1',
	md: 'size-8 rounded-md text-caption-2',
	lg: 'size-12 rounded-lg text-caption-2',
	max: 'size-45 rounded-2xl text-caption-2',
};

const TONE_CLASS_NAMES: Record<CologAvatarTone, string> = {
	subtle: 'bg-navy-100 text-navy-700',
	strong: 'bg-navy-200 text-navy-800',
};

export default function CologAvatar({
	className,
	size = 'md',
	tone = 'strong',
	src,
	...avatarProps
}: CologAvatarProps) {
	return (
		<Avatar
			{...avatarProps}
			src={getImageUrl(src) || undefined}
			className={`font-bold ${SIZE_CLASS_NAMES[size]} ${TONE_CLASS_NAMES[tone]} ${className ?? ''}`.trim()}
		/>
	);
}
