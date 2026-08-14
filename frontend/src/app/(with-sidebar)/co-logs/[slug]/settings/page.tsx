import CologSettingsWorkspace from '@/widgets/colog-settings/ui/CologSettingsWorkspace';

interface CologSettingsPageProps {
	params: Promise<{ slug: string }>;
}

export default async function CologSettingsPage({ params }: CologSettingsPageProps) {
	const { slug } = await params;

	return <CologSettingsWorkspace slug={slug} />;
}
