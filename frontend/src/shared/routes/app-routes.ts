export const APP_ROUTES = {
	feeds: '/feeds',
	cologCreate: '/colog/create',
	signUp: '/sign-up',
	write: '/write',
} as const;

export const COLOG_SETTINGS_TAB_IDS = ['profile', 'members', 'chapters', 'danger'] as const;
export type CologSettingsTab = (typeof COLOG_SETTINGS_TAB_IDS)[number];

export const RILOG_SETTINGS_TAB_IDS = ['profile', 'series', 'danger'] as const;
export type RilogSettingsTab = (typeof RILOG_SETTINGS_TAB_IDS)[number];

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

export const buildBlogHomePath = (slug: string) => {
	const normalizedSlug = decodeSegment(slug).trim().replace(/^@/, '');
	return `/@${normalizeSegment(normalizedSlug, '블로그 slug가 필요합니다.')}`;
};

export const hasBlogSlugPrefix = (slug: string) => decodeSegment(slug).trim().startsWith('@');

export const buildCologSettingsPath = (slug: string, tab: CologSettingsTab) =>
	`${buildBlogHomePath(slug)}/settings?tab=${tab}`;

export const buildCologMemberInvitePath = (slug: string) => `${buildCologSettingsPath(slug, 'members')}&invite=true`;

export const buildRilogSettingsPath = (slug: string, tab: RilogSettingsTab) =>
	`${buildBlogHomePath(slug)}/settings?tab=${tab}`;

export const buildPostDetailPath = (slug: string, postId: string) =>
	`${buildBlogHomePath(slug)}/posts/${normalizeSegment(postId, '게시글 ID가 필요합니다.')}`;

export const buildDraftWritePath = (draftId: number) => `${APP_ROUTES.write}?draftId=${draftId}`;

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
