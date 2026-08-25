import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { SettingsTabItem } from './settings-tabs';

import SettingsHeader from './SettingsHeader';

type PersonalSettingsTab = 'profile' | 'danger';

const TABS: SettingsTabItem<PersonalSettingsTab>[] = [
	{ id: 'profile', label: '프로필' },
	{ id: 'danger', label: '위험 영역' },
];

describe('SettingsHeader', () => {
	it('호출자가 전달한 탭과 ARIA namespace로 탭 헤더를 렌더링한다', async () => {
		const user = userEvent.setup();
		const onTabChangeRequest = vi.fn();
		render(
			<SettingsHeader
				activeTab="profile"
				tabs={TABS}
				tabListLabel="개인 설정"
				idPrefix="rilog-settings"
				title="프로필"
				description="개인 정보를 관리합니다."
				onTabChangeRequest={onTabChangeRequest}
			/>,
		);

		const profileTab = screen.getByRole('tab', { name: '프로필' });
		expect(profileTab).toHaveAttribute('id', 'rilog-settings-tab-profile');
		expect(profileTab).toHaveAttribute('aria-controls', 'rilog-settings-panel-profile');

		profileTab.focus();
		await user.keyboard('{ArrowRight}');
		expect(onTabChangeRequest).toHaveBeenCalledWith('danger');
	});
});
