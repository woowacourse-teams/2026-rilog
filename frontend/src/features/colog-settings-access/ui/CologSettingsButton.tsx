'use client';

import BlogManagementMenu from '@/features/blog-management/ui/BlogManagementMenu';
import { useCurrentCologPermission } from '@/features/colog-settings-access/hooks/use-current-colog-permission';
import { buildCologSettingsPath } from '@/shared/routes/app-routes';

interface CologSettingsButtonProps {
	isOnCover?: boolean;
	slug: string;
}

export default function CologSettingsButton({ isOnCover = false, slug }: CologSettingsButtonProps) {
	const permission = useCurrentCologPermission(slug);
	const iconColor = isOnCover ? 'var(--text-on-dark)' : 'var(--text-secondary)';

	if (permission === undefined) {
		return null;
	}

	return (
		<BlogManagementMenu
			ariaLabel="팀 블로그 메뉴"
			settingsHref={permission === 'MEMBER' ? undefined : buildCologSettingsPath(slug, 'profile')}
			showLeave={permission !== 'OWNER'}
			triggerColor={iconColor}
		/>
	);
}
