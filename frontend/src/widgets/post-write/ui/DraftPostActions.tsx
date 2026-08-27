'use client';

import { usePostDraftList } from '@/features/post-write/hooks/use-post-draft-list';
import { usePostDrafts } from '@/features/post-write/hooks/use-post-drafts';
import type { EditorDocument } from '@/features/post-write/model/post-publication';
import DraftListModal from '@/features/post-write/ui/DraftListModal';
import DraftWriteActionButtons from '@/features/post-write/ui/DraftWriteActionButtons';
import WritePublishActionBar from '@/features/post-write/ui/WritePublishActionBar';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

interface DraftPostActionsProps {
	isEditorReady: boolean;
	isPublishReady: boolean;
	prepareDocument: () => EditorDocument | null;
	onSave?: (document: EditorDocument) => void | Promise<void>;
	onPublish: () => void;
}

export default function DraftPostActions({
	isEditorReady,
	isPublishReady,
	prepareDocument,
	onSave,
	onPublish,
}: DraftPostActionsProps) {
	const draftList = usePostDraftList();
	const drafts = usePostDrafts({ prepareDocument, posts: draftList.data, onSave });

	return (
		<>
			<WritePublishActionBar
				isPublishReady={isPublishReady}
				secondaryActions={
					<DraftWriteActionButtons
						draftCount={drafts.posts.length}
						isEditorReady={isEditorReady}
						isSaveReady={isPublishReady}
						onSave={drafts.save}
						onListShow={drafts.openList}
					/>
				}
				onPublish={onPublish}
			/>

			<DraftListModal
				open={drafts.isListModalOpen}
				draftPosts={drafts.posts}
				isPending={draftList.isPending}
				isError={draftList.isError}
				hasNextPage={draftList.hasNextPage}
				isFetchingNextPage={draftList.isFetchingNextPage}
				isFetchNextPageError={draftList.isFetchNextPageError}
				onClose={drafts.closeList}
				onDelete={drafts.requestDeletion}
				onRetry={() => void draftList.refetch()}
				onLoadMore={() => void draftList.fetchNextPage()}
			/>

			<ConfirmModal
				open={drafts.isDeletionModalOpen}
				title="임시 저장 글을 삭제할까요?"
				description="삭제한 임시 저장 글은 복구할 수 없습니다."
				confirmLabel="삭제"
				cancelLabel="취소"
				variant="danger"
				onConfirm={drafts.confirmDeletion}
				onCancel={drafts.cancelDeletion}
			/>
		</>
	);
}
