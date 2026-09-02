import type { Metadata } from 'next';

import { extractPostDescription } from '@/domains/post/lib/extract-post-description';
import type { PostDetail } from '@/domains/post/model/post';
import { buildPostDetailPath } from '@/shared/routes/app-routes';
import { toApiUtcISOString } from '@/shared/utils/parse-api-utc-date';

export const getPostCanonicalPath = (post: PostDetail) => buildPostDetailPath(post.blog.slug, String(post.id));

export const createPostMetadata = (post: PostDetail): Metadata => {
	const canonical = getPostCanonicalPath(post);
	const description = extractPostDescription(post.content) || `${post.author.nickname}의 Rilog 게시글입니다.`;
	const image = post.thumbnailUrl ?? '/opengraph-image';
	return {
		alternates: { canonical },
		description,
		openGraph: {
			authors: [post.author.nickname],
			description,
			images: [image],
			publishedTime: toApiUtcISOString(post.publishedAt),
			title: post.title,
			type: 'article',
			url: canonical,
		},
		title: post.title,
		twitter: { card: 'summary_large_image', images: [image], title: post.title },
	};
};
