export interface ReleaseNoteItem {
	title: string;
	description: string;
}

export interface ReleaseNoteLink {
	label: string;
	href: string;
}

export interface ReleaseNote {
	/** 새 공지를 공개할 때마다 고유한 ID를 사용한다. */
	id: string;
	title: string;
	/** 공개 날짜, YYYY-MM-DD 형식. 같은 날짜는 목록 앞 항목을 우선한다. */
	publishedAt: string;
	items: readonly ReleaseNoteItem[];
	links?: readonly ReleaseNoteLink[];
}

// 실제 공개 문구가 확정된 공지만 추가한다. 예약 공개는 지원하지 않는다.
export const RELEASE_NOTES: readonly ReleaseNote[] = [
	{
		id: '2026-09-feed-update',
		title: 'Rilog. 패치노트 v2',
		publishedAt: '2026-09-05',
		items: [
			{
				title: '✍️ 개인 블로그에 글을 남겨보세요',
				description:
					'이제 개인 블로그에도 글을 발행할 수 있어요. 학습 기록부터 개인 프로젝트 회고까지 자유롭게 남겨보세요.',
			},
			{
				title: '📚 관련 글을 챕터와 시리즈로 모아보세요',
				description: 'Colog에서는 챕터로, 개인 블로그에서는 시리즈로 관련 글을 묶어 순서대로 정리할 수 있어요.',
			},
			{
				title: '👥 팀원 초대가 더 쉬워졌어요',
				description:
					'Colog 홈의 Members 영역에서 바로 멤버를 초대할 수 있어요. 초대한 멤버가 관리 목록에 표시되지 않던 문제도 수정했어요.',
			},
			{
				title: '🛠️ 불편했던 부분을 고쳤어요',
				description: '변경한 Colog 커버 이미지가 프로필에 반영되도록 수정하고, 로고의 균형을 다듬었어요.',
			},
		],
		links: [
			{
				label: '업데이트 자세히 보기 ↗',
				href: 'https://www.rilog.kr/@rilog/posts/42',
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
