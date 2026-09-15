import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { buildBlogHomePath, hasBlogSlugPrefix } from '@/shared/routes/app-routes';
import { redirectLegacySlug } from '@/shared/routes/redirect-legacy-slug';
import SettingsWorkspaceRouter from '@/widgets/settings/ui/SettingsWorkspaceRouter';

interface CologSettingsPageProps {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ tab?: string | string[]; invite?: string | string[] }>;
}

export const metadata: Metadata = {
	robots: { follow: false, index: false },
	title: '설정',
};

export default async function CologSettingsPage({ params, searchParams }: CologSettingsPageProps) {
	const { slug } = await params;
	const resolvedSearchParams = await searchParams;
	const { tab, invite } = resolvedSearchParams;
	if (!hasBlogSlugPrefix(slug)) {
		notFound();
	}

	redirectLegacySlug({
		slug,
		searchParams: resolvedSearchParams,
		buildPath: (normalizedSlug) => `${buildBlogHomePath(normalizedSlug)}/settings`,
	});

	return <SettingsWorkspaceRouter slug={slug} tab={tab} invite={invite} />;
}
