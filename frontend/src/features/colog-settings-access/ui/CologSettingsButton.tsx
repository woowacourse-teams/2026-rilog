'use client';

import { useRouter } from 'next/navigation';

import SettingsIcon from '@/shared/assets/icons/settings.svg';
import { buildCologSettingsPath } from '@/shared/routes/app-routes';
import Button from '@/shared/ui/button/Button';

import { useCologSettingsAccess } from '../hooks/use-colog-settings-access';

interface CologSettingsButtonProps {
	name: string;
	slug: string;
}

export default function CologSettingsButton({ name, slug }: CologSettingsButtonProps) {
	const router = useRouter();
	const accessStatus = useCologSettingsAccess(slug);

	if (accessStatus !== 'authorized') {
		return null;
	}

	return (
		<Button
			size="icon"
			aria-label={`${name} 코로그 설정으로 이동`}
			className="bg-transparent"
			onClick={() => router.push(buildCologSettingsPath(slug, 'profile'))}
		>
			<SettingsIcon aria-hidden="true" focusable="false" className="size-6" />
		</Button>
	);
}
