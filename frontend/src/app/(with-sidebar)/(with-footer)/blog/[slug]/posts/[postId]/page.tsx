import { notFound, permanentRedirect } from 'next/navigation';

import type { Metadata } from 'next';

import { parseBlogRouteSlug } from '@/features/blog-profile/lib/parse-blog-route-slug';
import { getPublicPostDetail } from '@/features/post-detail/lib/get-public-post-detail';
import { POST_DETAIL_SELECTION_QUERY_PARAM, buildPostDetailPath } from '@/shared/routes/app-routes';
import { appendSearchParams, redirectLegacySlug } from '@/shared/routes/redirect-legacy-slug';
import { normalizeLegacySlug } from '@/shared/utils/normalize-legacy-slug';
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

const parseSelectionId = (value: string | string[] | undefined): number | null => {
	if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
	const selectionId = Number(value);
	return Number.isSafeInteger(selectionId) ? selectionId : null;
};

export async function generateMetadata({ params }: PostDetailPageProps): Promise<Metadata> {
	const { slug, postId } = await params;

	const normalizedSlug = parseBlogRouteSlug(normalizeLegacySlug(slug));
	if (normalizedSlug === null) notFound();

	const post = await getPublicPostDetail(normalizedSlug, parsePostId(postId));
	if (post === null) notFound();

	return createPostMetadata(post);
}

export default async function PostDetailPage({ params, searchParams }: PostDetailPageProps) {
	const [{ slug, postId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
	redirectLegacySlug({
		slug,
		searchParams: resolvedSearchParams,
		buildPath: (normalizedSlug) => buildPostDetailPath(normalizedSlug, postId),
	});

	const normalizedSlug = parseBlogRouteSlug(slug);
	if (normalizedSlug === null) notFound();
	const post = await getPublicPostDetail(normalizedSlug, parsePostId(postId));
	if (post === null) notFound();

	const canonical = getPostCanonicalPath(post);
	if (normalizedSlug !== post.blog.slug) permanentRedirect(appendSearchParams(canonical, resolvedSearchParams));

	return (
		<PostDetail
			post={post}
			initialSelectionId={parseSelectionId(resolvedSearchParams[POST_DETAIL_SELECTION_QUERY_PARAM])}
		/>
	);
}
