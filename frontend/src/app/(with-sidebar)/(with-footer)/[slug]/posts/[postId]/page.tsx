import { notFound } from 'next/navigation';

import { getMockPostDetail } from '@/features/post-detail/model/post-detail.mock';
import { hasCologSlugPrefix } from '@/shared/routes/app-routes';
import PostDetail from '@/widgets/post-detail/PostDetail';

import './post-detail.css';

interface PostDetailPageProps {
	params: Promise<{ slug: string; postId: string }>;
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
	const { slug, postId } = await params;
	if (!hasCologSlugPrefix(slug)) {
		notFound();
	}
	const post = getMockPostDetail(postId);

	if (post === null) {
		notFound();
	}

	return <PostDetail post={post} />;
}
