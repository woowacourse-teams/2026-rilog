import type { Metadata } from 'next';

import { extractPostDescription } from '@/domains/post/lib/extract-post-description';
import type { PostDetail } from '@/domains/post/model/post';
import { buildPostDetailPath } from '@/shared/routes/app-routes';
import { createSocialMetadata, DEFAULT_OG_IMAGE } from '@/shared/seo/create-social-metadata';
import { getImageUrl } from '@/shared/utils/get-image-url';
import { toApiUtcISOString } from '@/shared/utils/parse-api-utc-date';

export const getPostCanonicalPath = (post: PostDetail) => buildPostDetailPath(post.blog.slug, String(post.id));

export const createPostMetadata = (post: PostDetail): Metadata => {
	const canonical = getPostCanonicalPath(post);
	const description = extractPostDescription(post.content) || `${post.author.nickname}의 Rilog 게시글입니다.`;
	const image = getImageUrl(post.thumbnailUrl) || DEFAULT_OG_IMAGE;

	return {
		alternates: { canonical },
		description,
		title: post.title,
		...createSocialMetadata({
			authors: [post.author.nickname],
			description,
			image,
			publishedTime: toApiUtcISOString(post.publishedAt),
			title: post.title,
			type: 'article',
			url: canonical,
		}),
	};
};
