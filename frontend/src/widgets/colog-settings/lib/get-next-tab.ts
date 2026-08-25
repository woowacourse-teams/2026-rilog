import type { CologSettingsTab } from '@/shared/routes/app-routes';
import type { SettingsTabItem } from '@/shared/ui/settings/settings-tabs';
import { getNextSettingsTab } from '@/shared/ui/settings/settings-tabs';

export type SettingsTab = CologSettingsTab;

export const SETTINGS_TABS: SettingsTabItem<SettingsTab>[] = [
	{ id: 'profile', label: '프로필' },
	{ id: 'members', label: '멤버 관리' },
	{ id: 'danger', label: '위험 영역' },
];

export const getNextTab = (currentTab: SettingsTab, key: string) => {
	return getNextSettingsTab(SETTINGS_TABS, currentTab, key);
};
