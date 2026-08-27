'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { useAuth } from '@/features/auth/model/use-auth';
import { recordEditorEntryContext } from '@/features/analytics/lib/editor-entry-context';
import { useDeletePostMutation } from '@/shared/api/posts/mutations/use-delete-post-mutation';
import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';
import { buildBlogHomePath } from '@/shared/routes/app-routes';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

interface PostDetailActionsProps {
	authorId: number;
	slug: string;
	postId: number;
}

export default function PostDetailActions({ authorId, slug, postId }: PostDetailActionsProps) {
	const router = useRouter();
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const { isAuthenticated, isInitialized } = useAuth();
	const myInfoQuery = useMyInfoQuery({ isEnabled: isInitialized });
	const deletePostMutation = useDeletePostMutation();
	const isAuthor = isInitialized && isAuthenticated && myInfoQuery.data?.data?.id === authorId;

	if (!isAuthor) {
		return null;
	}

	const handleEdit = () => {
		recordEditorEntryContext('post_detail_edit');
		router.push(`/write?postId=${postId}`);
	};
	const handleDeleteRequest = () => {
		deletePostMutation.reset();
		setIsDeleteModalOpen(true);
	};
	const handleDeleteCancel = () => {
		deletePostMutation.reset();
		setIsDeleteModalOpen(false);
	};
	const handleDeleteConfirm = () => {
		deletePostMutation.mutate(postId, {
			onSuccess: () => {
				setIsDeleteModalOpen(false);
				router.replace(buildBlogHomePath(slug));
			},
		});
	};
	return (
		<>
			<div className="absolute top-1/2 right-0 flex -translate-y-1/2 gap-2">
				<button onClick={handleEdit}>수정</button>
				<button onClick={handleDeleteRequest}>삭제</button>
			</div>

			<ConfirmModal
				open={isDeleteModalOpen}
				title="게시글을 삭제할까요?"
				description="삭제한 게시글은 복구할 수 없습니다."
				confirmLabel="삭제"
				variant="danger"
				isPending={deletePostMutation.isPending}
				onConfirm={handleDeleteConfirm}
				onCancel={handleDeleteCancel}
			/>
		</>
	);
}
