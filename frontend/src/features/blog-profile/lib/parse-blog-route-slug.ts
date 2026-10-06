import { normalizeUserSlug, validateUserSlug } from '@/domains/user/lib/validate-user-profile';

export const parseBlogRouteSlug = (routeSlug: string): string | null => {
	const slug = normalizeUserSlug(routeSlug);

	return validateUserSlug(slug) === undefined ? slug : null;
};
