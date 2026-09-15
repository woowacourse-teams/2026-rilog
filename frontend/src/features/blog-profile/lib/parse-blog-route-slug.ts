import { normalizeUserSlug, validateUserSlug } from '@/domains/user/lib/validate-user-profile';
import { hasBlogSlugPrefix } from '@/shared/routes/app-routes';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

export const parseBlogRouteSlug = (routeSlug: string): string | null => {
	if (!hasBlogSlugPrefix(routeSlug)) {
		return null;
	}

	const slug = normalizeUserSlug(stripAtPrefix(routeSlug));
	return validateUserSlug(slug) === undefined ? slug : null;
};
