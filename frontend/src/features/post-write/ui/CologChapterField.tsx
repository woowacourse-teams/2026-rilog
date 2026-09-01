'use client';

import type { BlogChapterOption } from '@/features/post-write/lib/map-blog-chapter-response';
import Field from '@/shared/ui/field/Field';

interface CologChapterFieldProps {
	chapters: BlogChapterOption[] | null;
	selectedChapterId: number | null;
	isDisabled: boolean;
	onChapterChange: (chapterId: number | null) => void;
}

export default function CologChapterField({
	chapters,
	selectedChapterId,
	isDisabled,
	onChapterChange,
}: CologChapterFieldProps) {
	const selectedChapterValue = selectedChapterId === null ? '' : String(selectedChapterId);
	const statusMessage =
		chapters === null
			? '코로그를 선택하면 챕터 목록을 확인할 수 있어요.'
			: chapters.length === 0
				? '등록된 챕터가 없습니다.'
				: undefined;

	return (
		<Field label="챕터" controlId="post-chapter">
			{({ id }) => (
				<div className="flex flex-col gap-3">
					<select
						id={id}
						value={selectedChapterValue}
						disabled={isDisabled || chapters === null}
						className="native-select"
						onChange={(event) => {
							const selectedValue = event.currentTarget.value;
							onChapterChange(selectedValue === '' ? null : Number(selectedValue));
						}}
					>
						<option value="">선택 안 함</option>
						{chapters?.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
					{statusMessage !== undefined && (
						<p className="text-label-2 text-text-secondary" role="status">
							{statusMessage}
						</p>
					)}
				</div>
			)}
		</Field>
	);
}
