'use client';

import { CHAPTER_NAME_MAX_LENGTH, type Chapter } from '@/domains/chapter/model/chapter';
import Input from '@/shared/ui/input/Input';

interface RilogSeriesRowProps {
	series: Chapter;
	isEditing?: boolean;
	onNameChange?: (seriesId: number, name: string) => void;
	onDelete?: (series: Chapter) => void;
}

export default function RilogSeriesRow({ series, isEditing = false, onNameChange, onDelete }: RilogSeriesRowProps) {
	const hasEmptyName = series.name.trim().length === 0;

	return (
		<tr className="h-18.5 border-b border-border-default">
			<td className="py-3 pl-6 text-body-1 font-semibold text-text-primary">
				{isEditing ? (
					<Input
						className="w-4/5!"
						data-ph-sensitive-attribute
						aria-label={`${series.name} 시리즈 이름`}
						value={series.name}
						maxLength={CHAPTER_NAME_MAX_LENGTH}
						status={hasEmptyName ? 'error' : 'default'}
						helperText={hasEmptyName ? '시리즈 이름을 입력해 주세요.' : undefined}
						onChange={(event) => onNameChange?.(series.id, event.target.value)}
					/>
				) : (
					series.name
				)}
			</td>
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
