'use client';

import { usePostWriteInitialData } from '@/features/post-write/hooks/use-post-write-initial-data';
import PostWriteAccessGuard from '@/features/post-write/ui/PostWriteAccessGuard';

import EditPostController from './EditPostController';

const loaderClassName = 'flex min-h-dvh items-center justify-center bg-background px-6 text-center';

interface EditPostLoaderProps {
	postId: number;
}

export default function EditPostLoader({ postId }: EditPostLoaderProps) {
	const initialDataQuery = usePostWriteInitialData({ postId, isEnabled: true });

	if (initialDataQuery.isPending) {
		return (
			<main className={loaderClassName}>
				<p className="text-body-2 text-text-secondary" role="status">
					게시글을 불러오고 있어요.
				</p>
			</main>
		);
	}

	if (initialDataQuery.isError || initialDataQuery.data === undefined) {
		return (
			<main className={loaderClassName}>
				<p className="text-body-2 text-danger-text" role="alert">
					{/* TODO: 추가 피드백 필요(버튼 등) */}
					게시글을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
				</p>
			</main>
		);
	}

	return (
		<PostWriteAccessGuard authorId={initialDataQuery.data.authorId}>
			<EditPostController
				key={postId}
				postId={postId}
				initialDocument={initialDataQuery.data.document}
				initialPublicationSettings={initialDataQuery.data.settings}
			/>
		</PostWriteAccessGuard>
	);
}
