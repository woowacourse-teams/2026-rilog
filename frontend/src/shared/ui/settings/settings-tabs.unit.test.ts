import { describe, expect, it } from 'vitest';

import { getNextSettingsTab, type SettingsTabItem } from './settings-tabs';

type PersonalSettingsTab = 'profile' | 'danger';

const PERSONAL_TABS: SettingsTabItem<PersonalSettingsTab>[] = [
	{ id: 'profile', label: '프로필' },
	{ id: 'danger', label: '위험 영역' },
];

describe('getNextSettingsTab', () => {
	it('호출자가 전달한 탭 목록에서 키보드 이동 대상을 찾는다', () => {
		expect(getNextSettingsTab(PERSONAL_TABS, 'profile', 'ArrowLeft')).toBe('danger');
		expect(getNextSettingsTab(PERSONAL_TABS, 'danger', 'Home')).toBe('profile');
		expect(getNextSettingsTab(PERSONAL_TABS, 'profile', 'Enter')).toBeNull();
	});
});
