'use client';

import { useBlogHomeIndex } from '@/features/blog-home-index/hooks/use-blog-home-index';
import type { PublicBlogPostsFilter } from '@/shared/api/blogs/types';

interface BlogHomeFeedHeadingProps {
	slug: string;
	filter: PublicBlogPostsFilter;
	initialIndexRequestFailed?: boolean;
}

export default function BlogHomeFeedHeading({
	slug,
	filter,
	initialIndexRequestFailed = false,
}: BlogHomeFeedHeadingProps) {
	const { index } = useBlogHomeIndex({ slug, initialRequestFailed: initialIndexRequestFailed });
	const title =
		filter.type === 'all'
			? '전체'
			: filter.type === 'chapterId'
				? (index?.chapterIndexes.find((chapter) => chapter.id === filter.chapterId)?.name ?? '챕터')
				: '전체';

	return <h2 className="mb-8 text-title-2 font-semibold wrap-break-word break-keep text-text-primary">{title}</h2>;
}
