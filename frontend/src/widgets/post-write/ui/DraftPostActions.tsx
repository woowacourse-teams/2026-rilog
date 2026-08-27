'use client';

import { usePostDraftList } from '@/features/post-write/hooks/use-post-draft-list';
import { usePostDrafts } from '@/features/post-write/hooks/use-post-drafts';
import type { EditorDocument } from '@/features/post-write/model/post-publication';
import DraftListModal from '@/features/post-write/ui/DraftListModal';
import DraftWriteActionButtons from '@/features/post-write/ui/DraftWriteActionButtons';
import WritePublishActionBar from '@/features/post-write/ui/WritePublishActionBar';
import { useDeleteDraftMutation } from '@/shared/api/drafts/mutations/use-delete-draft-mutation';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

interface DraftPostActionsProps {
	selectedDraftId?: number;
	isEditorReady: boolean;
	isSaveReady: boolean;
	isPublishReady: boolean;
	prepareDocument: () => EditorDocument | null;
	onSave?: (document: EditorDocument) => void | Promise<void>;
	onPublish: () => void;
}

export default function DraftPostActions({
	selectedDraftId,
	isEditorReady,
	isSaveReady,
	isPublishReady,
	prepareDocument,
	onSave,
	onPublish,
}: DraftPostActionsProps) {
	const draftList = usePostDraftList();
	const deleteDraftMutation = useDeleteDraftMutation();
	const drafts = usePostDrafts({
		prepareDocument,
		posts: draftList.data,
		onSave,
		onDelete: deleteDraftMutation.mutateAsync,
	});
	const requestDeletion = (postId: number) => {
		deleteDraftMutation.reset();
		drafts.requestDeletion(postId);
	};
	const cancelDeletion = () => {
		deleteDraftMutation.reset();
		drafts.cancelDeletion();
	};

	return (
		<>
			<WritePublishActionBar
				isPublishReady={isPublishReady}
				secondaryActions={
					<DraftWriteActionButtons
						draftCount={drafts.posts.length}
						isEditorReady={isEditorReady}
						isSaveReady={isSaveReady}
						onSave={drafts.save}
						onListShow={drafts.openList}
					/>
				}
				onPublish={onPublish}
			/>

			<DraftListModal
				open={drafts.isListModalOpen}
				draftPosts={drafts.posts}
				selectedDraftId={selectedDraftId}
				isPending={draftList.isPending}
				isError={draftList.isError}
				hasNextPage={draftList.hasNextPage}
				isFetchingNextPage={draftList.isFetchingNextPage}
				isFetchNextPageError={draftList.isFetchNextPageError}
				onClose={drafts.closeList}
				onDelete={requestDeletion}
				onRetry={() => void draftList.refetch()}
				onLoadMore={() => void draftList.fetchNextPage()}
			/>

			<ConfirmModal
				open={drafts.isDeletionModalOpen}
				title="임시 저장 글을 삭제할까요?"
				description={
					<>
						<span>삭제한 임시 저장 글은 복구할 수 없습니다.</span>
						{deleteDraftMutation.isError && (
							<span className="mt-2 block text-danger-text" role="alert">
								임시 저장 글을 삭제하지 못했습니다. 다시 시도해 주세요.
							</span>
						)}
					</>
				}
				confirmLabel="삭제"
				cancelLabel="취소"
				variant="danger"
				isPending={deleteDraftMutation.isPending}
				onConfirm={() => void drafts.confirmDeletion()}
				onCancel={cancelDeletion}
			/>
		</>
	);
}
