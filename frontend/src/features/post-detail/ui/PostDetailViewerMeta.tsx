'use client';

import { usePostViewerState } from '@/features/post-detail/hooks/use-post-viewer-state';

import PostDetailActions from './PostDetailActions';

interface PostDetailViewerMetaProps {
	slug: string;
	postId: number;
}

export default function PostDetailViewerMeta({ slug, postId }: PostDetailViewerMetaProps) {
	const { viewerPermissions, viewCount, sessionVersion } = usePostViewerState(slug, postId);
	return (
		<>
			{viewerPermissions.canDelete && viewCount !== null ? (
				<>
					<span aria-hidden="true">·</span>
					<span aria-label={`조회수 ${viewCount.toLocaleString('ko-KR')}회`}>
						조회수 {viewCount.toLocaleString('ko-KR')}
					</span>
				</>
			) : null}
			<PostDetailActions
				key={`${slug}:${postId}:${sessionVersion}`}
				slug={slug}
				postId={postId}
				viewerPermissions={viewerPermissions}
			/>
		</>
	);
}
