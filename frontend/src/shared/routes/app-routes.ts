export const APP_ROUTES = {
	feeds: '/feeds',
	cologCreate: '/co-logs/create',
	signUp: '/sign-up',
	write: '/write',
} as const;

export type CologSettingsTab = 'profile' | 'members' | 'danger';

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

export const hasCologSlugPrefix = (slug: string) => decodeSegment(slug).trim().startsWith('@');

export const buildCologSettingsPath = (slug: string, tab: CologSettingsTab) =>
	`${buildBlogHomePath(slug)}/settings?tab=${tab}`;

export const buildPostDetailPath = (slug: string, postId: string) =>
	`${buildBlogHomePath(slug)}/posts/${normalizeSegment(postId, '게시글 ID가 필요합니다.')}`;

export const parseCologSettingsTab = (value: string | string[] | undefined): CologSettingsTab => {
	const tab = Array.isArray(value) ? value[0] : value;

	return tab === 'members' || tab === 'danger' ? tab : 'profile';
};
