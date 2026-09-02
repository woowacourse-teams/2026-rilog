import { notFound, permanentRedirect } from 'next/navigation';

import type { Metadata } from 'next';

import { getPublicPostDetail } from '@/features/post-detail/lib/get-public-post-detail';
import { hasBlogSlugPrefix } from '@/shared/routes/app-routes';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';
import PostDetail from '@/widgets/post-detail/PostDetail';

import { createPostMetadata, getPostCanonicalPath } from './metadata';
import './post-detail.css';

interface PostDetailPageProps {
	params: Promise<{ slug: string; postId: string }>;
}

const parsePostId = (postId: string) => {
	const value = Number(postId);
	if (!Number.isSafeInteger(value) || value < 1) notFound();

	return value;
};

export async function generateMetadata({ params }: PostDetailPageProps): Promise<Metadata> {
	const { postId } = await params;
	const post = await getPublicPostDetail(parsePostId(postId));
	if (post === null) notFound();

	return createPostMetadata(post);
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
	const { slug, postId } = await params;
	if (!hasBlogSlugPrefix(slug)) {
		notFound();
	}

	const post = await getPublicPostDetail(parsePostId(postId));
	if (post === null) notFound();

	const canonical = getPostCanonicalPath(post);
	if (stripAtPrefix(slug) !== post.blog.slug) permanentRedirect(canonical);

	return <PostDetail post={post} />;
}
