import type { useChapterManagement } from '@/features/chapter-management/hooks/use-chapter-management';
import { getApiErrorMessage } from '@/shared/api/api-error';
import Button from '@/shared/ui/button/Button';
import ConfirmModal from '@/shared/ui/modal/ConfirmModal';

import ChapterCreateModal from './ChapterCreateModal';
import CologChapterRow from './CologChapterRow';

interface CologChapterManagementSectionProps {
	management: ReturnType<typeof useChapterManagement>;
}

export default function CologChapterManagementSection({ management }: CologChapterManagementSectionProps) {
	const {
		displayedChapters,
		isEditing,
		isCreateModalOpen,
		setIsCreateModalOpen,
		handleNameChange,
		handleAddChapter,
		isLoading,
		isLoadError,
		refetch,
		isCreating,
		createError,
		resetCreateError,
		saveError,
		chapterToDelete,
		requestChapterDelete,
		cancelChapterDelete,
		confirmChapterDelete,
		isDeletingChapter,
		chapterDeleteError,
	} = management;

	if (isLoading) {
		return (
			<p className="px-6 py-12 text-center text-body-2 text-text-secondary sm:px-8 lg:px-0" role="status">
				챕터를 불러오는 중...
			</p>
		);
	}

	if (isLoadError) {
		return (
			<div className="flex flex-col items-center gap-4 px-6 py-12 text-center sm:px-8 lg:px-0" role="alert">
				<p className="text-body-2 text-text-secondary">챕터를 불러오지 못했어요.</p>
				<Button variant="secondary" onClick={() => void refetch()}>
					다시 시도
				</Button>
			</div>
		);
	}

	const handleCreateModalClose = () => {
		resetCreateError();
		setIsCreateModalOpen(false);
	};

	return (
		<section className="px-6 sm:px-8 lg:px-0">
			<div>
				<table className="w-full table-fixed border-collapse text-left">
					<caption className="sr-only">팀 챕터 목록</caption>
					<colgroup>
						<col className="w-1/2" />
						<col className="w-1/2" />
					</colgroup>
					<thead className="bg-background shadow-[inset_0_-1px_0_var(--color-border-default)]">
						<tr className="h-13.5 text-body-1 font-semibold text-text-secondary">
							<th scope="col" className="pl-6 font-semibold">
								챕터
							</th>
							{/* TODO: 챕터 조회 API가 게시글 수를 제공하면 열을 다시 노출한다. */}
							{/* <th scope="col" className="px-2 font-semibold">
								게시글 수
							</th> */}
							<th scope="col">
								<span className="sr-only">챕터 작업</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{displayedChapters.length === 0 ? (
							<tr>
								<td colSpan={2} className="px-6 py-12 text-center text-body-2 text-text-secondary">
									아직 등록된 챕터가 없어요.
								</td>
							</tr>
						) : (
							displayedChapters.map((chapter) => (
								<CologChapterRow
									key={chapter.id}
									chapter={chapter}
									isEditing={isEditing}
									onNameChange={handleNameChange}
									onDelete={requestChapterDelete}
								/>
							))
						)}
					</tbody>
				</table>
			</div>

			<ChapterCreateModal
				open={isCreateModalOpen}
				onClose={handleCreateModalClose}
				onCreate={handleAddChapter}
				isPending={isCreating}
				errorMessage={createError === null ? undefined : getApiErrorMessage(createError, '챕터를 추가하지 못했어요.')}
			/>
			{saveError !== null && (
				<p className="mt-4 rounded-md border border-danger p-3 text-label-2 text-danger" role="alert">
					{getApiErrorMessage(saveError, '일부 챕터 이름을 변경하지 못했어요.')}
				</p>
			)}

			<ConfirmModal
				open={chapterToDelete !== null}
				title={`${chapterToDelete?.name ?? ''} 챕터를 삭제할까요?`}
				description={
					<>
						<span>
							챕터는 삭제 후 복구할 수 없습니다.
							<br />
							포함된 게시글은 챕터에서 분리되며 그대로 유지됩니다.
						</span>
						{chapterDeleteError !== null && (
							<span className="mt-2 block text-danger" role="alert">
								{getApiErrorMessage(chapterDeleteError, '챕터를 삭제하지 못했어요. 다시 시도해 주세요.')}
							</span>
						)}
					</>
				}
				confirmLabel="삭제"
				cancelLabel="취소"
				variant="danger"
				isPending={isDeletingChapter}
				onConfirm={() => void confirmChapterDelete()}
				onCancel={cancelChapterDelete}
			/>
		</section>
	);
}
