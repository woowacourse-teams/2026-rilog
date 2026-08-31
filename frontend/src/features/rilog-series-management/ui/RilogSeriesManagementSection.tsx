import type { RilogSeries } from '../model/rilog-series';

import RilogSeriesRow from './RilogSeriesRow';
import SeriesCreateModal from './SeriesCreateModal';

interface RilogSeriesManagementSectionProps {
	series: RilogSeries[];
	isEditing?: boolean;
	onSeriesNameChange?: (seriesId: number, name: string) => void;
	onDeleteSeries?: (series: RilogSeries) => void;
	isCreateModalOpen?: boolean;
	onCloseCreateModal?: () => void;
	onCreateSeries?: (name: string) => void;
}

export default function RilogSeriesManagementSection({
	series,
	isEditing = false,
	onSeriesNameChange,
	onDeleteSeries,
	isCreateModalOpen = false,
	onCloseCreateModal,
	onCreateSeries,
}: RilogSeriesManagementSectionProps) {
	return (
		<section className="px-6 sm:px-8 lg:px-0">
			<div className="overflow-x-auto overflow-y-hidden overscroll-x-contain contain-[paint]">
				<table className="w-full table-fixed border-collapse text-left">
					<caption className="sr-only">시리즈 목록</caption>
					<colgroup>
						<col className="w-1/3" />
						<col className="w-1/3" />
						<col className="w-1/3" />
					</colgroup>
					<thead className="bg-background shadow-[inset_0_-1px_0_var(--color-border-default)]">
						<tr className="h-13.5 text-body-1 font-semibold text-text-secondary">
							<th scope="col" className="pl-6 font-semibold">
								시리즈
							</th>
							<th scope="col" className="px-2 font-semibold">
								게시글 수
							</th>
							<th scope="col">
								<span className="sr-only">시리즈 작업</span>
							</th>
						</tr>
					</thead>
					<tbody>
						{series.map((item) => (
							<RilogSeriesRow
								key={item.id}
								series={item}
								isEditing={isEditing}
								onNameChange={onSeriesNameChange}
								onDelete={onDeleteSeries}
							/>
						))}
					</tbody>
				</table>
			</div>
			{onCloseCreateModal !== undefined && onCreateSeries !== undefined && (
				<SeriesCreateModal open={isCreateModalOpen} onClose={onCloseCreateModal} onCreate={onCreateSeries} />
			)}
		</section>
	);
}
