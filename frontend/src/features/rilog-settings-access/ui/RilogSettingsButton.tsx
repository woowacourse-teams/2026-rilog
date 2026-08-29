'use client';

import BlogManagementMenu from '@/features/blog-management/ui/BlogManagementMenu';
import { useSettingsAccess } from '@/features/settings-access/hooks/use-settings-access';
import { buildRilogSettingsPath } from '@/shared/routes/app-routes';

interface RilogSettingsButtonProps {
	slug: string;
}

export default function RilogSettingsButton({ slug }: RilogSettingsButtonProps) {
	const accessStatus = useSettingsAccess({ type: 'RILOG', slug });

	if (accessStatus !== 'authorized') {
		return null;
	}

	return <BlogManagementMenu ariaLabel="개인 블로그 메뉴" settingsHref={buildRilogSettingsPath(slug, 'profile')} />;
}
