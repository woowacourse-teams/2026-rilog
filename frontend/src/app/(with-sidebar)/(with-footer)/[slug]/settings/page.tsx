import { notFound, redirect } from 'next/navigation';

import { buildCologSettingsPath, hasCologSlugPrefix, parseCologSettingsTab } from '@/shared/routes/app-routes';
import CologSettingsWorkspace from '@/widgets/colog-settings/ui/CologSettingsWorkspace';

interface CologSettingsPageProps {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ tab?: string | string[] }>;
}

export default async function CologSettingsPage({ params, searchParams }: CologSettingsPageProps) {
	const { slug } = await params;
	const { tab } = await searchParams;
	const initialTab = parseCologSettingsTab(tab);
	const requestedTab = Array.isArray(tab) ? tab[0] : tab;

	if (!hasCologSlugPrefix(slug)) {
		notFound();
	}

	if (requestedTab !== initialTab) {
		redirect(buildCologSettingsPath(slug, initialTab));
	}

	return <CologSettingsWorkspace slug={slug} initialTab={initialTab} />;
}
