import { notFound } from 'next/navigation';

import type { Block } from '@blocknote/core';

import type { PostDetail as PostDetailModel } from '@/domains/post/model/post-detail';
import { readBlogPostDetail } from '@/shared/api/blogs/api';
import type { PostDetailResponse } from '@/shared/api/blogs/types';
import { hasCologSlugPrefix } from '@/shared/routes/app-routes';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';
import PostDetail from '@/widgets/post-detail/PostDetail';

import './post-detail.css';

interface PostDetailPageProps {
	params: Promise<{ slug: string; postId: string }>;
}

const mapBlogPostDetailResponse = (response: PostDetailResponse): PostDetailModel => ({
	title: response.title,
	content: Array.isArray(response.content) ? (response.content as Block[]) : [],
	publishedAt: response.publishedAt,
	thumbnailImageUrl: response.thumbnailImageUrl,
	author: {
		nickname: response.author.nickname,
		slug: response.author.slug,
	},
	colog:
		response.owner.type === 'COLOG'
			? {
					name: response.owner.name,
					slug: response.owner.slug,
					description: '',
					memberCount: response.owner.memberCount,
					postCount: response.owner.postCount,
				}
			: null,
});

export default async function PostDetailPage({ params }: PostDetailPageProps) {
	const { slug, postId } = await params;
	if (!hasCologSlugPrefix(slug)) {
		notFound();
	}

	const normalizedSlug = stripAtPrefix(slug);
	const response = await readBlogPostDetail({ slug: normalizedSlug, postId: Number(postId) });
	const post = response.data === undefined ? null : mapBlogPostDetailResponse(response.data);

	if (post === null) {
		notFound();
	}

	return <PostDetail post={post} />;
}
