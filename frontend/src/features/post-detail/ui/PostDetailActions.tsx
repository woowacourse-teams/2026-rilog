'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { PostViewerPermissions } from '@/domains/post/model/post';
import { recordEditorEntryContext } from '@/features/analytics/lib/editor-entry-context';
import { tokenManager } from '@/shared/api/auth/token-manager';
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
	// This observer survives temporary permission masking during detail refetches.
	const deletePostMutation = useDeletePostMutation();
	const { canEdit, canDelete } = viewerPermissions;

	if (!canEdit && !canDelete) return null;

	const handleEdit = () => {
		recordEditorEntryContext('post_detail_edit');
		router.push(`/write?postId=${postId}&slug=${encodeURIComponent(slug)}`);
	};
	return (
		<div className="flex items-center gap-2 before:content-['·']">
			{canEdit ? (
				<button
					className="rounded-sm transition-colors hover:text-focus-ring focus-visible:text-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring active:text-focus-ring"
					onClick={handleEdit}
				>
					수정
				</button>
			) : null}
			{canDelete ? (
				<PostDetailDeleteAction
					postId={postId}
					mutation={deletePostMutation}
					onDeleted={() => router.replace(buildBlogHomePath(slug))}
				/>
			) : null}
		</div>
	);
}

interface PostDetailDeleteActionProps {
	postId: number;
	mutation: ReturnType<typeof useDeletePostMutation>;
	onDeleted: () => void;
}

function PostDetailDeleteAction({ postId, mutation, onDeleted }: PostDetailDeleteActionProps) {
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const handleDeleteRequest = () => {
		mutation.reset();
		setIsDeleteModalOpen(true);
	};
	const handleDeleteCancel = () => {
		mutation.reset();
		setIsDeleteModalOpen(false);
	};
	const handleDeleteConfirm = () => {
		const sessionVersion = tokenManager.getSessionVersion();
		mutation.mutate(postId, {
			onSuccess: () => {
				if (sessionVersion !== tokenManager.getSessionVersion()) return;
				setIsDeleteModalOpen(false);
				onDeleted();
			},
		});
	};
	return (
		<>
			<button
				className="rounded-sm transition-colors hover:text-danger focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
				disabled={mutation.isPending}
				onClick={handleDeleteRequest}
			>
				삭제
			</button>
			<ConfirmModal
				open={isDeleteModalOpen}
				title="게시글을 삭제할까요?"
				description="삭제한 게시글은 복구할 수 없습니다."
				confirmLabel="삭제"
				variant="danger"
				isPending={mutation.isPending}
				onConfirm={handleDeleteConfirm}
				onCancel={handleDeleteCancel}
			/>
		</>
	);
}
