import { notFound, permanentRedirect } from 'next/navigation';

import type { Metadata } from 'next';

import { getPublicPostDetail } from '@/features/post-detail/lib/get-public-post-detail';
import { buildPostDetailPath, hasBlogSlugPrefix } from '@/shared/routes/app-routes';
import { redirectLegacySlug } from '@/shared/routes/redirect-legacy-slug';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';
import PostDetail from '@/widgets/post-detail/PostDetail';

import { createPostMetadata, getPostCanonicalPath } from './metadata';
import './post-detail.css';

interface PostDetailPageProps {
	params: Promise<{ slug: string; postId: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
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

export default async function PostDetailPage({ params, searchParams }: PostDetailPageProps) {
	const [{ slug, postId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
	if (!hasBlogSlugPrefix(slug)) {
		notFound();
	}

	redirectLegacySlug({
		slug,
		searchParams: resolvedSearchParams,
		buildPath: (normalizedSlug) => buildPostDetailPath(normalizedSlug, postId),
	});

	const post = await getPublicPostDetail(parsePostId(postId));
	if (post === null) notFound();

	const canonical = getPostCanonicalPath(post);
	if (stripAtPrefix(slug) !== post.blog.slug) permanentRedirect(canonical);

	return <PostDetail post={post} />;
}
