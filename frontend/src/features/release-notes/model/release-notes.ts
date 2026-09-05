export interface ReleaseNoteItem {
	title: string;
	description: string;
}

export interface ReleaseNote {
	/** 새 공지를 공개할 때마다 고유한 ID를 사용한다. */
	id: string;
	title: string;
	/** 공개 날짜, YYYY-MM-DD 형식. 같은 날짜는 목록 앞 항목을 우선한다. */
	publishedAt: string;
	items: readonly ReleaseNoteItem[];
}

// 실제 공개 문구가 확정된 공지만 추가한다. 예약 공개는 지원하지 않는다.
export const RELEASE_NOTES: readonly ReleaseNote[] = [
	{
		id: '2026-09-feed-update',
		title: 'Rilog. 패치노트 v2',
		publishedAt: '2026-09-05',
		items: [
			{
				title: '송아지가 태어났어요!!',
				description: '다들 축하해주세용~',
			},
			{
				title: '파라디가 아직도!!! 아프대요~',
				description: '다들 위로해주세요 ㅠㅠ',
			},
		],
	},
];

export function getLatestReleaseNote(notes: readonly ReleaseNote[]): ReleaseNote | undefined {
	return notes.reduce<ReleaseNote | undefined>(
		(latest, note) => (!latest || note.publishedAt > latest.publishedAt ? note : latest),
		undefined,
	);
}
