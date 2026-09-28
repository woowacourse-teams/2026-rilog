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
	intro?: string;
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
	{
		id: '2026-09-14-update',
		title: 'Rilog. 패치노트 v3',
		publishedAt: '2026-09-14',
		items: [
			{
				title: '📁 카테고리로 원하는 글만 모아보세요',
				description:
					'기술, 회고, 일상 카테고리가 새로 생겼어요. 피드의 노이즈는 줄이고 관심 있는 주제의 글만 명확하게 골라 읽을 수 있어요.',
			},
			{
				title: '🗂️ 챕터와 시리즈로 글을 더 깔끔하게 정리하세요',
				description:
					'카테고리로 전체 성격을 나누고, 개인 블로그는 시리즈, Colog는 챕터로 관련 글들을 묶어 나만의 흐름으로 정리할 수 있어요.',
			},
			{
				title: '🎨 피드와 상세 화면 레이아웃을 정돈했어요',
				description:
					'시각적 피로감을 줄이도록 전체 피드를 한눈에 파악하기 쉽게 개편하고, 게시글 상세 UI와 목차, 썸네일 비율을 깔끔하게 다듬었어요.',
			},
			{
				title: '🔍 사이드바와 푸터 접근성을 개선했어요',
				description:
					'자주 찾는 서비스 정보와 문의 메일을 더 쉽게 찾으실 수 있도록 사이드바에 추가하고, 푸터 UI를 정돈했어요.',
			},
		],
		links: [
			{
				label: '업데이트 자세히 보기 ↗',
				href: 'https://www.rilog.kr/@rilog/posts/83',
			},
		],
	},
	{
		id: '2026-09-28-inline-comments-seo',
		title: 'Rilog. 패치노트 v4',
		publishedAt: '2026-09-28',
		intro: 'Rilog.가 4살이 되었습니다. 이제 글을 읽다 궁금해진 문장에서 바로 이야기를 시작할 수 있어요.',
		items: [
			{
				title: '💬 궁금한 문장에 바로 댓글을 남겨보세요',
				description:
					'글을 읽다가 이야기하고 싶은 부분을 드래그해 그 자리에 바로 댓글을 남길 수 있어요. 글이 수정되더라도 당시 선택한 문장과 대화는 전체 목록에 안전하게 남아요.',
			},
			{
				title: '🔍 검색 서비스와 AI 도구의 접근성을 개선했어요',
				description:
					'검색 서비스와 AI 검색 도구가 공개 블로그와 게시글의 위치, 원문 주소를 더 잘 파악할 수 있도록 사이트 안내와 주소 정보를 깔끔하게 정리했어요.',
			},
		],
		links: [
			{
				label: '업데이트 자세히 보기 ↗',
				href: 'https://www.rilog.kr/@official/posts/127',
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
