import { appendSearchParams } from './append-search-params';

export const APP_ROUTES = {
	about: '/about',
	feeds: '/feeds',
	cologCreate: '/colog/create',
	signUp: '/sign-up',
	write: '/write',
	notifications: '/notifications',
} as const;

export const COLOG_SETTINGS_TAB_IDS = ['profile', 'members', 'chapters', 'danger'] as const;
export type CologSettingsTab = (typeof COLOG_SETTINGS_TAB_IDS)[number];

export const RILOG_SETTINGS_TAB_IDS = ['profile', 'series', 'danger'] as const;
export type RilogSettingsTab = (typeof RILOG_SETTINGS_TAB_IDS)[number];

export const BLOG_HOME_FILTER_SEARCH_PARAMS = {
	series: 'series',
	chapter: 'chapter',
	colog: 'colog',
} as const;

export type BlogHomePathOptions =
	| { seriesId: number; chapterId?: never; cologSlug?: never }
	| { seriesId?: never; chapterId: number; cologSlug?: never }
	| { seriesId?: never; chapterId?: never; cologSlug: string };

const normalizeSegment = (value: string, errorMessage: string) => {
	const normalizedValue = value.trim();

	if (normalizedValue.length === 0) {
		throw new Error(errorMessage);
	}

	return encodeURIComponent(normalizedValue);
};

const decodeSegment = (value: string) => {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
};

export const buildBlogHomePath = (slug: string, options?: BlogHomePathOptions) => {
	const normalizedSlug = decodeSegment(slug).trim().replace(/^@/, '');
	const pathname = `/@${normalizeSegment(normalizedSlug, '블로그 slug가 필요합니다.')}`;

	if (options === undefined) {
		return pathname;
	}

	if ('seriesId' in options) {
		return appendSearchParams(pathname, { [BLOG_HOME_FILTER_SEARCH_PARAMS.series]: String(options.seriesId) });
	} else if ('chapterId' in options) {
		return appendSearchParams(pathname, { [BLOG_HOME_FILTER_SEARCH_PARAMS.chapter]: String(options.chapterId) });
	}

	return appendSearchParams(pathname, { [BLOG_HOME_FILTER_SEARCH_PARAMS.colog]: options.cologSlug });
};

export const hasBlogSlugPrefix = (slug: string) => decodeSegment(slug).trim().startsWith('@');

export const buildCologSettingsPath = (slug: string, tab: CologSettingsTab) =>
	appendSearchParams(`${buildBlogHomePath(slug)}/settings`, { tab });

export const buildCologMemberInvitePath = (slug: string) =>
	appendSearchParams(buildCologSettingsPath(slug, 'members'), { invite: 'true' });

export const buildRilogSettingsPath = (slug: string, tab: RilogSettingsTab) =>
	appendSearchParams(`${buildBlogHomePath(slug)}/settings`, { tab });

export const buildPostDetailPath = (slug: string, postId: string) =>
	`${buildBlogHomePath(slug)}/posts/${normalizeSegment(postId, '게시글 ID가 필요합니다.')}`;

export const POST_DETAIL_SELECTION_QUERY_PARAM = 'selectionId';

export const buildPostDetailSelectionPath = (slug: string, postId: string, selectionId: number) =>
	appendSearchParams(buildPostDetailPath(slug, postId), { [POST_DETAIL_SELECTION_QUERY_PARAM]: String(selectionId) });

export const buildDraftWritePath = (draftId: number) =>
	appendSearchParams(APP_ROUTES.write, { draftId: String(draftId) });

const isSettingsTab = <T extends string>(tab: string | undefined, tabs: readonly T[]): tab is T => {
	return tab !== undefined && tabs.some((candidate) => candidate === tab);
};

export const parseCologSettingsTab = (value: string | string[] | undefined): CologSettingsTab => {
	const tab = Array.isArray(value) ? value[0] : value;

	return isSettingsTab(tab, COLOG_SETTINGS_TAB_IDS) ? tab : 'profile';
};

export const parseRilogSettingsTab = (value: string | string[] | undefined): RilogSettingsTab => {
	const tab = Array.isArray(value) ? value[0] : value;

	return isSettingsTab(tab, RILOG_SETTINGS_TAB_IDS) ? tab : 'profile';
};
