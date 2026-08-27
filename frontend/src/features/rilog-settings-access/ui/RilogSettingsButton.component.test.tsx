import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SettingsAccessStatus } from '@/features/settings-access/hooks/use-settings-access';

import RilogSettingsButton from './RilogSettingsButton';

const { useSettingsAccessMock } = vi.hoisted(() => ({
	useSettingsAccessMock: vi.fn<() => SettingsAccessStatus>(),
}));

vi.mock('@/features/settings-access/hooks/use-settings-access', () => ({ useSettingsAccess: useSettingsAccessMock }));

describe('RilogSettingsButton', () => {
	beforeEach(() => useSettingsAccessMock.mockReset());

	it('본인에게만 개인 설정 링크를 제공한다', () => {
		useSettingsAccessMock.mockReturnValue('authorized');
		render(<RilogSettingsButton slug="rilogger" />);
		expect(screen.getByRole('link', { name: '개인 설정' })).toHaveAttribute('href', '/@rilogger/settings?tab=profile');
	});

	it.each(['initializing', 'checking', 'unauthenticated', 'forbidden', 'error'] as const)(
		'%s 상태에서는 숨긴다',
		(status) => {
			useSettingsAccessMock.mockReturnValue(status);
			render(<RilogSettingsButton slug="rilogger" />);
			expect(screen.queryByRole('link')).not.toBeInTheDocument();
		},
	);
});
