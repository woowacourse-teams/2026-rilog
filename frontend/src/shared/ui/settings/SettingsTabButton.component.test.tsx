import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import SettingsTabButton from './SettingsTabButton';

const TAB = { id: 'profile', label: '프로필' } as const;

describe('SettingsTabButton', () => {
	it('활성 탭의 tabpanel 연결과 키보드 진입 상태를 제공한다', () => {
		render(<SettingsTabButton tab={TAB} isActive idPrefix="settings" />);

		const tab = screen.getByRole('tab', { name: '프로필' });
		expect(tab).toHaveAttribute('id', 'settings-tab-profile');
		expect(tab).toHaveAttribute('aria-controls', 'settings-panel-profile');
		expect(tab).toHaveAttribute('aria-selected', 'true');
		expect(tab).toHaveAttribute('tabindex', '0');
	});

	it('비활성 탭은 roving tab 순서에서 제외하고 click을 전달한다', async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(<SettingsTabButton tab={TAB} isActive={false} idPrefix="settings" onClick={onClick} />);

		const tab = screen.getByRole('tab', { name: '프로필' });
		expect(tab).toHaveAttribute('aria-selected', 'false');
		expect(tab).toHaveAttribute('tabindex', '-1');
		await user.click(tab);
		expect(onClick).toHaveBeenCalledOnce();
	});
});
