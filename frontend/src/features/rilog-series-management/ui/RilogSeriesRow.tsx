'use client';

import type { Chapter } from '@/features/chapter-management/model/chapter';
import Input from '@/shared/ui/input/Input';

interface RilogSeriesRowProps {
	series: Chapter;
	isEditing?: boolean;
	onNameChange?: (seriesId: number, name: string) => void;
	onDelete?: (series: Chapter) => void;
}

export default function RilogSeriesRow({ series, isEditing = false, onNameChange, onDelete }: RilogSeriesRowProps) {
	return (
		<tr className="h-18.5 border-b border-border-default">
			<td className="py-3 pl-6 text-body-1 font-semibold text-text-primary">
				{isEditing ? (
					<Input
						className="w-4/5!"
						aria-label={`${series.name} 시리즈 이름`}
						value={series.name}
						onChange={(event) => onNameChange?.(series.id, event.target.value)}
					/>
				) : (
					series.name
				)}
			</td>
			<td className="px-2 py-3 text-label-1 text-text-secondary">{series.postCount}개</td>
			<td className="py-3 pr-8 text-right">
				{!isEditing && (
					<button
						type="button"
						aria-label={`${series.name} 시리즈 삭제`}
						onClick={() => onDelete?.(series)}
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
