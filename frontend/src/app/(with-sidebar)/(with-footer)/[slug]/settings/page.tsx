import { notFound, redirect } from 'next/navigation';

import { mapCologMemberResponse } from '@/features/colog-member-management/lib/map-colog-member-response';
import CologSettingsAccessGuard from '@/features/colog-settings-access/ui/CologSettingsAccessGuard';
import { readCologMembers } from '@/shared/api/cologs/api';
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

	let initialMembers;

	try {
		const membersResponse = await readCologMembers(slug);
		if (membersResponse.data) {
			initialMembers = membersResponse.data.map(mapCologMemberResponse);
		}
	} catch {
		// 실패 시 기본 처리 (임시)
	}

	return (
		<CologSettingsAccessGuard slug={slug}>
			<CologSettingsWorkspace slug={slug} initialTab={initialTab} initialMembers={initialMembers} />
		</CologSettingsAccessGuard>
	);
}
