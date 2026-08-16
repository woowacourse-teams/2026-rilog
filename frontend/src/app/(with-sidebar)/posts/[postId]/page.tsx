import { notFound } from 'next/navigation';

import { getMockPostDetail } from '@/features/post-detail/model/post-detail.mock';
import PostDetail from '@/widgets/post-detail/PostDetail';

import './post-detail.css';

interface PostDetailPageProps {
	params: Promise<{ postId: string }>;
}

export default async function PostDetailPage({ params }: PostDetailPageProps) {
	const { postId } = await params;
	const post = getMockPostDetail(postId);

	if (post === null) {
		notFound();
	}

	return <PostDetail post={post} />;
}
