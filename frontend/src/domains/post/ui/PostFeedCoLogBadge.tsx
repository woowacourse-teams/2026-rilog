import type { PostFeedCoLog } from '@/domains/post/model/post-feed';

import PostFeedImage from './PostFeedImage';

interface PostFeedCoLogBadgeProps {
	colog: PostFeedCoLog;
	//추후 chapter 들어올 예정
}

export default function PostFeedCoLogBadge({ colog }: PostFeedCoLogBadgeProps) {
	return (
		<span className="absolute top-3 left-3 flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-md border border-border-default bg-surface py-1 pr-2.5 pl-1.5 text-caption-2 font-semibold text-text-primary shadow-sm">
			<span className="size-5 shrink-0 overflow-hidden rounded-full bg-background">
				<PostFeedImage
					src={colog.logoUrl}
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
