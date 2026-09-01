import type { useChapterDrafts } from '@/features/chapter-management/hooks/use-chapter-drafts';

import ChapterCreateModal from './ChapterCreateModal';
import CologChapterRow from './CologChapterRow';

interface CologChapterManagementSectionProps {
	drafts: ReturnType<typeof useChapterDrafts>;
}

export default function CologChapterManagementSection({ drafts }: CologChapterManagementSectionProps) {
	const { displayedChapters, isEditing, isCreateModalOpen, setIsCreateModalOpen, handleNameChange, handleAddChapter } =
		drafts;

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
						{displayedChapters.map((chapter) => (
							<CologChapterRow
								key={chapter.id}
								chapter={chapter}
								isEditing={isEditing}
								onNameChange={handleNameChange}
							/>
						))}
					</tbody>
				</table>
			</div>

			<ChapterCreateModal
				open={isCreateModalOpen}
				onClose={() => setIsCreateModalOpen(false)}
				onCreate={handleAddChapter}
			/>
		</section>
	);
}
