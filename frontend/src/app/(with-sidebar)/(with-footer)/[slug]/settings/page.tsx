import { notFound } from 'next/navigation';

import { hasBlogSlugPrefix } from '@/shared/routes/app-routes';
import SettingsWorkspaceRouter from '@/widgets/settings/ui/SettingsWorkspaceRouter';

interface CologSettingsPageProps {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ tab?: string | string[] }>;
}

export default async function CologSettingsPage({ params, searchParams }: CologSettingsPageProps) {
	const { slug } = await params;
	const { tab } = await searchParams;
	if (!hasBlogSlugPrefix(slug)) {
		notFound();
	}

	return <SettingsWorkspaceRouter slug={slug} tab={tab} />;
}
