import { COLOG_SETTINGS_TAB_IDS, type CologSettingsTab } from '@/shared/routes/app-routes';
import type { SettingsTabItem } from '@/shared/ui/settings/settings-tabs';

const COLOG_SETTINGS_TAB_LABELS = {
	profile: '프로필',
	members: '멤버 관리',
	danger: '위험 영역',
} satisfies Record<CologSettingsTab, string>;

export const COLOG_SETTINGS_TABS: SettingsTabItem<CologSettingsTab>[] = COLOG_SETTINGS_TAB_IDS.map((id) => ({
	id,
	label: COLOG_SETTINGS_TAB_LABELS[id],
}));
