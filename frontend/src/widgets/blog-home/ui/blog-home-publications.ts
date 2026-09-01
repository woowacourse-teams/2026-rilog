export interface PublicationNavigationItem {
	id: string;
	name: string;
	postCount: number;
}

export interface AffiliatedCologNavigationItem extends PublicationNavigationItem {
	slug: string;
	logoUrl: string | null;
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

export const AFFILIATED_COLOGS: readonly AffiliatedCologNavigationItem[] = [
	{
		id: 'woowa-bros',
		slug: 'woowa-bros',
		name: '우아한형제들',
		postCount: 12,
		logoUrl: '/images/colog-placeholder.svg',
	},
	{ id: 'rilog-team', slug: 'rilog-team', name: 'Rilog', postCount: 6, logoUrl: '/brand/favicon.png' },
	{ id: 'goguma', slug: 'goguma', name: '고구마사랑어쩌고', postCount: 0, logoUrl: null },
];
