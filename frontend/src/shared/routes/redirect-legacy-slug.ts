import { permanentRedirect } from 'next/navigation';

import { normalizeLegacySlug } from '@/shared/utils/normalize-legacy-slug';

export interface RedirectLegacySlugOptions {
	slug: string;
	searchParams: Record<string, string | string[] | undefined>;
	buildPath: (normalizedSlug: string) => string;
}

const appendSearchParams = (pathname: string, searchParams: RedirectLegacySlugOptions['searchParams']) => {
	const query = new URLSearchParams();

	Object.entries(searchParams).forEach(([key, value]) => {
		if (Array.isArray(value)) {
			value.forEach((item) => query.append(key, item));
		} else if (value !== undefined) {
			query.set(key, value);
		}
	});

	const queryString = query.toString();
	return queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
};

export const redirectLegacySlug = ({ slug, searchParams, buildPath }: RedirectLegacySlugOptions) => {
	const normalizedSlug = normalizeLegacySlug(slug);

	if (normalizedSlug === slug) {
		return;
	}

	permanentRedirect(appendSearchParams(buildPath(normalizedSlug), searchParams));
};
