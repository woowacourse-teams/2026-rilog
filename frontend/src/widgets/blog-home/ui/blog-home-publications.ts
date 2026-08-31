export interface PublicationNavigationItem {
	id: string;
	name: string;
	postCount: number;
}

export interface PublicationCologItem extends PublicationNavigationItem {
	chapters: readonly PublicationNavigationItem[];
}

export const COLOG_CHAPTERS: readonly PublicationNavigationItem[] = [
	{ id: 'fe', name: 'FE', postCount: 16 },
	{ id: 'be', name: 'BE', postCount: 12 },
	{ id: 'design', name: 'Design', postCount: 8 },
	{ id: 'po-pm', name: 'PO/PM', postCount: 6 },
];

export const SERIES: readonly PublicationNavigationItem[] = [
	{ id: 'woowacourse', name: '우테코에서 살아남기', postCount: 12 },
	{ id: 'retrospective', name: '회고', postCount: 7 },
	{ id: 'react', name: 'React', postCount: 3 },
	{ id: 'typescript', name: 'TypeScript', postCount: 4 },
];

export const AFFILIATED_COLOGS: readonly PublicationCologItem[] = [
	{
		id: 'woowa-bros',
		name: '우아한형제들',
		postCount: 12,
		chapters: [
			{ id: 'woowa-fe', name: 'FE', postCount: 7 },
			{ id: 'woowa-common', name: '공통', postCount: 3 },
			{ id: 'woowa-culture', name: '문화', postCount: 2 },
		],
	},
	{
		id: 'rilog-team',
		name: 'Rilog',
		postCount: 6,
		chapters: [
			{ id: 'rilog-frontend', name: 'Frontend', postCount: 4 },
			{ id: 'rilog-retrospective', name: '회고', postCount: 2 },
		],
	},
	{ id: 'goguma', name: '고구마사랑어쩌고', postCount: 0, chapters: [] },
];
