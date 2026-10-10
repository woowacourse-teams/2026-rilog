import { permanentRedirect } from 'next/navigation';

import { normalizeLegacySlug } from '@/shared/utils/normalize-legacy-slug';

import { appendSearchParams } from './append-search-params';

export interface RedirectLegacySlugOptions {
	slug: string;
	searchParams: Record<string, string | string[] | undefined>;
	buildPath: (normalizedSlug: string) => string;
}

export const redirectLegacySlug = ({ slug, searchParams, buildPath }: RedirectLegacySlugOptions) => {
	const normalizedSlug = normalizeLegacySlug(slug);

	if (normalizedSlug === slug) {
		return;
	}

	permanentRedirect(appendSearchParams(buildPath(normalizedSlug), searchParams));
};
