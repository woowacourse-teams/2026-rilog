import type { CologChapter } from '../model/colog-chapter';

import ChapterCreateModal from './ChapterCreateModal';
import CologChapterRow from './CologChapterRow';

interface CologChapterManagementSectionProps {
	chapters: CologChapter[];
	isEditing?: boolean;
	onChapterNameChange?: (chapterId: number, name: string) => void;
	onDeleteChapter?: (chapter: CologChapter) => void;
	isCreateModalOpen?: boolean;
	onCloseCreateModal?: () => void;
	onCreateChapter?: (name: string) => void;
}

export default function CologChapterManagementSection({
	chapters,
	isEditing = false,
	onChapterNameChange,
	onDeleteChapter,
	isCreateModalOpen = false,
	onCloseCreateModal,
	onCreateChapter,
}: CologChapterManagementSectionProps) {
	return (
		<section className="px-6 sm:px-8 lg:px-0">
			<div className="overflow-x-auto overflow-y-hidden overscroll-x-contain contain-[paint]">
				<table className="w-full min-w-3xl table-fixed border-collapse text-left">
					<caption className="sr-only">팀 챕터 목록</caption>
					<colgroup>
						<col className="w-1/3" />
						<col className="w-1/3" />
						<col className="w-1/3" />
					</colgroup>
					<thead className="bg-background shadow-[inset_0_-1px_0_var(--color-border-default)]">
						<tr className="h-13.5 text-body-1 font-semibold text-text-secondary">
							<th scope="col" className="pl-6 font-semibold">
								챕터
							</th>
							<th scope="col" className="px-2 font-semibold">
								게시글 수
							</th>
							<th scope="col">
								<span className="sr-only">챕터 작업</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{chapters.map((chapter) => (
							<CologChapterRow
								key={chapter.id}
								chapter={chapter}
								isEditing={isEditing}
								onNameChange={onChapterNameChange}
								onDelete={onDeleteChapter}
							/>
						))}
					</tbody>
				</table>
			</div>
			{onCloseCreateModal !== undefined && onCreateChapter !== undefined && (
				<ChapterCreateModal open={isCreateModalOpen} onClose={onCloseCreateModal} onCreate={onCreateChapter} />
			)}
		</section>
	);
}
