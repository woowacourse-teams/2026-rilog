import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CologSettingsAccessStatus } from '../hooks/use-colog-settings-access';

import CologSettingsButton from './CologSettingsButton';

const { pushMock, useCologSettingsAccessMock } = vi.hoisted(() => ({
	pushMock: vi.fn(),
	useCologSettingsAccessMock: vi.fn<() => CologSettingsAccessStatus>(),
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: pushMock }),
}));

vi.mock('../hooks/use-colog-settings-access', () => ({
	useCologSettingsAccess: useCologSettingsAccessMock,
}));

describe('CologSettingsButton', () => {
	beforeEach(() => {
		pushMock.mockReset();
		useCologSettingsAccessMock.mockReset();
	});

	it('설정 접근 권한이 있으면 설정 버튼을 제공하고 기본 설정 탭으로 이동한다', async () => {
		const user = userEvent.setup();
		useCologSettingsAccessMock.mockReturnValue('authorized');

		render(<CologSettingsButton name="리로그" slug="rilog" />);
		await user.click(screen.getByRole('button', { name: '리로그 코로그 설정으로 이동' }));

		expect(pushMock).toHaveBeenCalledWith('/@rilog/settings?tab=profile');
	});

	it.each(['initializing', 'checking', 'unauthenticated', 'forbidden', 'error'] as const)(
		'%s 상태에서는 설정 버튼을 렌더링하지 않는다',
		(status) => {
			useCologSettingsAccessMock.mockReturnValue(status);

			render(<CologSettingsButton name="리로그" slug="rilog" />);

			expect(screen.queryByRole('button')).not.toBeInTheDocument();
		},
	);
});
