import type { CologSettingsTab } from '@/shared/routes/app-routes';

export type SettingsTab = CologSettingsTab;

export interface SettingsTabItem {
	id: SettingsTab;
	label: string;
}

export const SETTINGS_TABS: SettingsTabItem[] = [
	{ id: 'profile', label: '프로필' },
	{ id: 'members', label: '멤버 관리' },
	{ id: 'danger', label: '위험 영역' },
];

export const getNextTab = (currentTab: SettingsTab, key: string) => {
	const currentIndex = SETTINGS_TABS.findIndex(({ id }) => id === currentTab);

	switch (key) {
		case 'ArrowRight':
			return SETTINGS_TABS[(currentIndex + 1) % SETTINGS_TABS.length]?.id ?? null;
		case 'ArrowLeft':
			return SETTINGS_TABS[(currentIndex - 1 + SETTINGS_TABS.length) % SETTINGS_TABS.length]?.id ?? null;
		case 'Home':
			return SETTINGS_TABS[0]?.id ?? null;
		case 'End':
			return SETTINGS_TABS.at(-1)?.id ?? null;
		default:
			return null;
	}
};
