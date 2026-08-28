import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SettingsAccessStatus } from '@/features/settings-access/hooks/use-settings-access';

import CologSettingsButton from './CologSettingsButton';

const { useSettingsAccessMock } = vi.hoisted(() => ({
	useSettingsAccessMock: vi.fn<() => SettingsAccessStatus>(),
}));

vi.mock('@/features/settings-access/hooks/use-settings-access', () => ({
	useSettingsAccess: useSettingsAccessMock,
}));

describe('CologSettingsButton', () => {
	beforeEach(() => {
		useSettingsAccessMock.mockReset();
	});

	it('설정 접근 권한이 있으면 기본 설정 탭 링크를 제공한다', () => {
		useSettingsAccessMock.mockReturnValue('authorized');

		render(<CologSettingsButton slug="rilog" />);

		const settingsLink = screen.getByRole('link', { name: '팀 설정' });
		expect(settingsLink).toHaveAttribute('href', '/@rilog/settings?tab=profile');
		expect(settingsLink).not.toHaveTextContent('팀 설정');
		expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent('팀 설정');
	});

	it('커버 이미지 위에서는 밝은 아이콘 색상을 사용한다', () => {
		useSettingsAccessMock.mockReturnValue('authorized');

		render(<CologSettingsButton slug="rilog" isOnCover />);

		expect(screen.getByRole('link', { name: '팀 설정' })).toHaveStyle({ color: 'var(--text-on-dark)' });
	});

	it.each(['initializing', 'checking', 'unauthenticated', 'forbidden', 'error'] as const)(
		'%s 상태에서는 설정 버튼을 렌더링하지 않는다',
		(status) => {
			useSettingsAccessMock.mockReturnValue(status);

			render(<CologSettingsButton slug="rilog" />);

			expect(screen.queryByRole('link')).not.toBeInTheDocument();
		},
	);
});
