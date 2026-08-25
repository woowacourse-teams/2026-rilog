import { notFound } from 'next/navigation';

import { mapPostDetailResponse } from '@/features/post-detail/lib/map-post-detail-response';
import { readPostDetail } from '@/shared/api/posts/api';
import { hasBlogSlugPrefix } from '@/shared/routes/app-routes';
import PostDetail from '@/widgets/post-detail/PostDetail';

import './post-detail.css';

interface PostDetailPageProps {
	params: Promise<{ slug: string; postId: string }>;
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
	const { slug, postId } = await params;
	if (!hasBlogSlugPrefix(slug)) {
		notFound();
	}

	const parsedPostId = Number(postId);
	const response = await readPostDetail({ postId: parsedPostId });
	const post = response.data === undefined ? null : mapPostDetailResponse(response.data, parsedPostId);

	if (post === null) {
		notFound();
	}

	return <PostDetail post={post} />;
}
