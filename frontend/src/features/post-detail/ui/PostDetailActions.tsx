'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { PostViewerPermissions } from '@/domains/post/model/post';
import { recordEditorEntryContext } from '@/features/analytics/lib/editor-entry-context';
import { usePostViewerPermissions } from '@/features/post-detail/hooks/use-post-viewer-permissions';
import { useDeletePostMutation } from '@/shared/api/posts/mutations/use-delete-post-mutation';
import { buildBlogHomePath } from '@/shared/routes/app-routes';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

interface PostDetailActionsProps {
	slug: string;
	postId: number;
	viewerPermissions: PostViewerPermissions;
}

export default function PostDetailActions({ slug, postId, viewerPermissions }: PostDetailActionsProps) {
	const router = useRouter();
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const deletePostMutation = useDeletePostMutation();
	const { canEdit, canDelete } = usePostViewerPermissions({
		postId,
		initialPermissions: viewerPermissions,
	});

	if (!canEdit && !canDelete) {
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
			<div className="flex items-center gap-2 before:content-['·']">
				{canEdit ? (
					<button
						className="rounded-sm transition-colors hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
						onClick={handleEdit}
					>
						수정
					</button>
				) : null}
				{canDelete ? (
					<button
						className="rounded-sm transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
						onClick={handleDeleteRequest}
					>
						삭제
					</button>
				) : null}
			</div>

			{canDelete ? (
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
			) : null}
		</>
	);
}
