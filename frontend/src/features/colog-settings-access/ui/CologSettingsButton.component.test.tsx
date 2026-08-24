import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CologSettingsAccessStatus } from '../hooks/use-colog-settings-access';

import CologSettingsButton from './CologSettingsButton';

const { useCologSettingsAccessMock } = vi.hoisted(() => ({
	useCologSettingsAccessMock: vi.fn<() => CologSettingsAccessStatus>(),
}));

vi.mock('../hooks/use-colog-settings-access', () => ({
	useCologSettingsAccess: useCologSettingsAccessMock,
}));

describe('CologSettingsButton', () => {
	beforeEach(() => {
		useCologSettingsAccessMock.mockReset();
	});

	it('설정 접근 권한이 있으면 기본 설정 탭 링크를 제공한다', () => {
		useCologSettingsAccessMock.mockReturnValue('authorized');

		render(<CologSettingsButton slug="rilog" />);

		const settingsLink = screen.getByRole('link', { name: '코로그 설정' });
		expect(settingsLink).toHaveAttribute('href', '/@rilog/settings?tab=profile');
		expect(settingsLink).not.toHaveTextContent('코로그 설정');
		expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('코로그 설정');
	});

	it('커버 이미지 위에서는 밝은 아이콘 색상을 사용한다', () => {
		useCologSettingsAccessMock.mockReturnValue('authorized');

		render(<CologSettingsButton slug="rilog" isOnCover />);

		expect(screen.getByRole('link', { name: '코로그 설정' })).toHaveStyle({ color: 'var(--text-on-dark)' });
	});

	it.each(['initializing', 'checking', 'unauthenticated', 'forbidden', 'error'] as const)(
		'%s 상태에서는 설정 버튼을 렌더링하지 않는다',
		(status) => {
			useCologSettingsAccessMock.mockReturnValue(status);

			render(<CologSettingsButton slug="rilog" />);

			expect(screen.queryByRole('link')).not.toBeInTheDocument();
		},
	);
});
