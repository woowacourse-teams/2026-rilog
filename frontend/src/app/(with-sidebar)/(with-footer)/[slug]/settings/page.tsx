import { notFound } from 'next/navigation';

import type { Metadata } from 'next';

import { hasBlogSlugPrefix } from '@/shared/routes/app-routes';
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
	const { tab, invite } = await searchParams;
	if (!hasBlogSlugPrefix(slug)) {
		notFound();
	}

	return <SettingsWorkspaceRouter slug={slug} tab={tab} invite={invite} />;
}
