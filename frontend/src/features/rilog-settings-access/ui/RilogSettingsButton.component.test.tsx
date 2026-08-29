import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SettingsAccessStatus } from '@/features/settings-access/hooks/use-settings-access';

import RilogSettingsButton from './RilogSettingsButton';

const { useSettingsAccessMock } = vi.hoisted(() => ({
	useSettingsAccessMock: vi.fn<() => SettingsAccessStatus>(),
}));

vi.mock('@/features/settings-access/hooks/use-settings-access', () => ({ useSettingsAccess: useSettingsAccessMock }));

describe('RilogSettingsButton', () => {
	beforeEach(() => useSettingsAccessMock.mockReset());

	it('소유자에게 개인 설정 옵션만 제공한다', async () => {
		const user = userEvent.setup();
		useSettingsAccessMock.mockReturnValue('authorized');
		render(<RilogSettingsButton slug="rilogger" />);

		await user.click(screen.getByRole('button', { name: '개인 블로그 메뉴' }));

		expect(screen.getByRole('menuitem', { name: '설정' })).toHaveAttribute('href', '/@rilogger/settings?tab=profile');
		expect(screen.queryByRole('menuitem', { name: '탈퇴' })).not.toBeInTheDocument();
	});

	it.each(['initializing', 'checking', 'unauthenticated', 'forbidden', 'error'] as const)(
		'%s 상태에서는 미트볼 버튼을 숨긴다',
		(status) => {
			useSettingsAccessMock.mockReturnValue(status);
			render(<RilogSettingsButton slug="rilogger" />);
			expect(screen.queryByRole('button', { name: '개인 블로그 메뉴' })).not.toBeInTheDocument();
		},
	);
});
