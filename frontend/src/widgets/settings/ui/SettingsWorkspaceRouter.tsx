'use client';

import { useEffect } from 'react';

import type { BlogType } from '@/domains/blog/model/blog';
import CologSettingsAccessGuard from '@/features/colog-settings-access/ui/CologSettingsAccessGuard';
import RilogSettingsAccessGuard from '@/features/rilog-settings-access/ui/RilogSettingsAccessGuard';
import { useBlogPublicProfileQuery } from '@/shared/api/blogs/queries/public-profile/use-query';
import {
	buildCologSettingsPath,
	buildRilogSettingsPath,
	parseCologSettingsTab,
	parseRilogSettingsTab,
	type CologSettingsTab,
	type RilogSettingsTab,
} from '@/shared/routes/app-routes';
import PageShell from '@/shared/ui/page-shell/PageShell';
import CologSettingsWorkspace from '@/widgets/colog-settings/ui/CologSettingsWorkspace';
import RilogSettingsWorkspace from '@/widgets/rilog-settings/ui/RilogSettingsWorkspace';

interface SettingsWorkspaceRouterProps {
	slug: string;
	tab?: string | string[];
}

type SettingsRoute =
	| { type: 'RILOG'; initialTab: RilogSettingsTab; canonicalPath: string }
	| { type: 'COLOG'; initialTab: CologSettingsTab; canonicalPath: string };

const getSettingsRoute = (
	blogType: BlogType | undefined,
	slug: string,
	tab: string | string[] | undefined,
): SettingsRoute | null => {
	if (blogType === 'RILOG') {
		const initialTab = parseRilogSettingsTab(tab);
		return { type: 'RILOG', initialTab, canonicalPath: buildRilogSettingsPath(slug, initialTab) };
	}

	if (blogType === 'COLOG') {
		const initialTab = parseCologSettingsTab(tab);
		return { type: 'COLOG', initialTab, canonicalPath: buildCologSettingsPath(slug, initialTab) };
	}

	return null;
};

export default function SettingsWorkspaceRouter({ slug, tab }: SettingsWorkspaceRouterProps) {
	const profileQuery = useBlogPublicProfileQuery({ slug });
	const requestedTab = Array.isArray(tab) ? tab[0] : tab;
	const profile = profileQuery.data?.data;
	const settingsRoute = getSettingsRoute(profile?.type, slug, tab);
	const normalizedTab = settingsRoute?.initialTab;
	const canonicalPath = settingsRoute?.canonicalPath;

	useEffect(() => {
		if (canonicalPath !== undefined && requestedTab !== normalizedTab) {
			window.history.replaceState(window.history.state, '', canonicalPath);
		}
	}, [canonicalPath, normalizedTab, requestedTab]);

	if (profileQuery.isPending) {
		return (
			<PageShell>
				<p className="flex min-h-64 items-center justify-center text-body-2 text-text-secondary" role="status">
					설정 정보를 불러오는 중...
				</p>
			</PageShell>
		);
	}

	if (profileQuery.isError || settingsRoute === null) {
		return (
			<PageShell>
				<p className="flex min-h-64 items-center justify-center text-body-2 text-danger-text" role="alert">
					설정 정보를 불러오지 못했습니다.
				</p>
			</PageShell>
		);
	}

	if (settingsRoute.type === 'RILOG') {
		return (
			<RilogSettingsAccessGuard slug={slug}>
				<RilogSettingsWorkspace slug={slug} initialTab={settingsRoute.initialTab} />
			</RilogSettingsAccessGuard>
		);
	}

	if (settingsRoute.type === 'COLOG') {
		return (
			<CologSettingsAccessGuard slug={slug}>
				<CologSettingsWorkspace slug={slug} initialTab={settingsRoute.initialTab} />
			</CologSettingsAccessGuard>
		);
	}
}
