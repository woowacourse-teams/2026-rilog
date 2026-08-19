import type { CologBlog } from '@/domains/blog/model/blog';

import PostFeedImage from './PostFeedImage';

interface PostFeedCologBadgeProps {
	// 추후 챕터까지 추가
	// colog: Pick<CologBlog, 'profileImageUrl' | 'name' | 'chapter'>;
	colog: Pick<CologBlog, 'profileImageUrl' | 'name'>;
}

export default function PostFeedCologBadge({ colog }: PostFeedCologBadgeProps) {
	return (
		<span className="absolute top-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-md border border-border-default bg-surface py-1 pr-2.5 pl-1.5 text-caption-2 font-semibold text-text-primary shadow-sm">
			<span className="size-5 shrink-0 overflow-hidden rounded-full bg-background">
				<PostFeedImage
					src={colog.profileImageUrl}
					alt={colog.name}
					width={20}
					height={20}
					className="size-full object-cover"
					fallbackClassName="object-contain p-1"
				/>
			</span>
			<span className="truncate">{colog.name}</span>
		</span>
	);
}
