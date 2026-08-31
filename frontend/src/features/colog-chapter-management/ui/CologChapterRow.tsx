'use client';

import type { CologChapter } from '../model/colog-chapter';

import Input from '@/shared/ui/input/Input';

interface CologChapterRowProps {
	chapter: CologChapter;
	isEditing?: boolean;
	onNameChange?: (chapterId: number, name: string) => void;
	onDelete?: (chapter: CologChapter) => void;
}

export default function CologChapterRow({ chapter, isEditing = false, onNameChange, onDelete }: CologChapterRowProps) {
	return (
		<tr className="h-18.5 border-b border-border-default">
			<td className="py-3 pl-6 text-body-1 font-semibold text-text-primary">
				{isEditing ? (
					<Input
						className="w-4/5!"
						aria-label={`${chapter.name} 챕터 이름`}
						value={chapter.name}
						onChange={(event) => onNameChange?.(chapter.id, event.target.value)}
					/>
				) : (
					chapter.name
				)}
			</td>
			<td className="px-2 py-3 text-label-1 text-text-secondary">{chapter.postCount}개</td>
			<td className="py-3 pr-8 text-right">
				{!isEditing && (
					<button
						type="button"
						aria-label={`${chapter.name} 챕터 삭제`}
						onClick={() => onDelete?.(chapter)}
						className="inline-flex size-6 items-center justify-center rounded-full bg-surface-active text-danger transition-colors hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-focus-ring"
					>
						<span aria-hidden="true" className="text-body-2 leading-none font-bold">
							−
						</span>
					</button>
				)}
			</td>
		</tr>
	);
}
