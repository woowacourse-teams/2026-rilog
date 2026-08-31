import { RILOG_SETTINGS_TAB_IDS, type RilogSettingsTab } from '@/shared/routes/app-routes';
import type { SettingsTabItem } from '@/shared/ui/settings/settings-tabs';

const RILOG_SETTINGS_TAB_LABELS = {
	profile: '프로필',
	series: '시리즈 관리',
	danger: '위험 영역',
} satisfies Record<RilogSettingsTab, string>;

export const RILOG_SETTINGS_TABS: SettingsTabItem<RilogSettingsTab>[] = RILOG_SETTINGS_TAB_IDS.map((id) => ({
	id,
	label: RILOG_SETTINGS_TAB_LABELS[id],
}));
