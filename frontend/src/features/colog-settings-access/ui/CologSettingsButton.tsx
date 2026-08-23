'use client';

import SettingsIcon from '@/shared/assets/icons/settings.svg';
import { buildCologSettingsPath } from '@/shared/routes/app-routes';
import ButtonLink from '@/shared/ui/button/ButtonLink';

import { useCologSettingsAccess } from '../hooks/use-colog-settings-access';

interface CologSettingsButtonProps {
	isOnCover?: boolean;
	slug: string;
}

export default function CologSettingsButton({ isOnCover = false, slug }: CologSettingsButtonProps) {
	const accessStatus = useCologSettingsAccess(slug);
	const iconColor = isOnCover ? 'var(--text-on-dark)' : 'var(--text-secondary)';

	if (accessStatus !== 'authorized') {
		return null;
	}

	return (
		<span className="group/settings relative inline-flex">
			<ButtonLink
				href={buildCologSettingsPath(slug, 'profile')}
				variant="ghost"
				size="icon"
				aria-label="코로그 설정"
				className="size-11! bg-transparent hover:bg-surface/20 active:bg-surface/30"
				style={{ color: iconColor }}
			>
				<SettingsIcon aria-hidden="true" focusable="false" className="size-5" />
			</ButtonLink>
			<span
				role="tooltip"
				aria-hidden="true"
				className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 -translate-x-1/2 rounded-md bg-brand-primary px-2 py-1 text-caption-1 font-medium whitespace-nowrap text-text-on-dark opacity-0 shadow-sm transition-opacity duration-150 group-focus-within/settings:opacity-100 group-hover/settings:opacity-100"
			>
				코로그 설정
			</span>
		</span>
	);
}
