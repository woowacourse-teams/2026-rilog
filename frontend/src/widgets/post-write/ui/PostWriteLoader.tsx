'use client';

import { useSearchParams } from 'next/navigation';

import { usePostWriteInitialData } from '@/features/post-write/hooks/use-post-write-initial-data';
import PostWriteAccessGuard from '@/features/post-write/ui/PostWriteAccessGuard';

import PostWriteWorkspace from './PostWriteWorkspace';

const loaderClassName = 'flex min-h-dvh items-center justify-center bg-background px-6 text-center';

export default function PostWriteLoader() {
	const searchParams = useSearchParams();
	const rawPostId = searchParams.get('postId');
	const parsedPostId = Number(rawPostId);
	const isEditMode = rawPostId !== null;
	const isValidPostId =
		isEditMode && rawPostId.trim().length > 0 && Number.isSafeInteger(parsedPostId) && parsedPostId > 0;
	const initialDataQuery = usePostWriteInitialData({
		postId: isValidPostId ? parsedPostId : 0,
		isEnabled: isValidPostId,
	});

	if (!isEditMode) {
		return <PostWriteWorkspace />;
	}

	if (!isValidPostId) {
		return (
			<main className={loaderClassName}>
				<p className="text-body-2 text-danger-text" role="alert">
					{/* TODO: 추가 피드백 필요(리다이렉트 등) */}
					올바르지 않은 게시글 ID입니다.
				</p>
			</main>
		);
	}

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
			<PostWriteWorkspace
				key={parsedPostId}
				postId={parsedPostId}
				initialDocument={initialDataQuery.data.document}
				initialPublicationSettings={initialDataQuery.data.settings}
			/>
		</PostWriteAccessGuard>
	);
}
