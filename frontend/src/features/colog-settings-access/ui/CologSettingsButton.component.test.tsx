import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BlogMemberResponse } from '@/shared/api/cologs/types';

import CologSettingsButton from './CologSettingsButton';

const { useCurrentCologPermissionMock } = vi.hoisted(() => ({
	useCurrentCologPermissionMock: vi.fn<() => BlogMemberResponse['permission'] | undefined>(),
}));

vi.mock('@/features/colog-settings-access/hooks/use-current-colog-permission', () => ({
	useCurrentCologPermission: useCurrentCologPermissionMock,
}));

describe('CologSettingsButton', () => {
	beforeEach(() => {
		useCurrentCologPermissionMock.mockReset();
	});

	it('OWNER에게 설정 옵션만 제공한다', async () => {
		const user = userEvent.setup();
		useCurrentCologPermissionMock.mockReturnValue('OWNER');
		render(<CologSettingsButton slug="rilog" />);

		await user.click(screen.getByRole('button', { name: '팀 블로그 메뉴' }));

		expect(screen.getByRole('menuitem', { name: '설정' })).toHaveAttribute('href', '/@rilog/settings?tab=profile');
		expect(screen.queryByRole('menuitem', { name: '탈퇴' })).not.toBeInTheDocument();
	});

	it('ADMIN에게 설정과 탈퇴 옵션을 모두 제공한다', async () => {
		const user = userEvent.setup();
		useCurrentCologPermissionMock.mockReturnValue('ADMIN');
		render(<CologSettingsButton slug="rilog" />);

		await user.click(screen.getByRole('button', { name: '팀 블로그 메뉴' }));

		expect(screen.getByRole('menuitem', { name: '설정' })).toHaveAttribute('href', '/@rilog/settings?tab=profile');
		expect(screen.getByRole('menuitem', { name: '탈퇴' })).toBeInTheDocument();
	});

	it('MEMBER에게 핸들러 없는 탈퇴 옵션만 제공한다', async () => {
		const user = userEvent.setup();
		useCurrentCologPermissionMock.mockReturnValue('MEMBER');
		render(<CologSettingsButton slug="rilog" />);

		await user.click(screen.getByRole('button', { name: '팀 블로그 메뉴' }));

		expect(screen.queryByRole('menuitem', { name: '설정' })).not.toBeInTheDocument();
		expect(screen.getByRole('menuitem', { name: '탈퇴' })).toBeInTheDocument();
	});

	it('멤버가 아니거나 권한 확인 전에는 미트볼 버튼을 렌더링하지 않는다', () => {
		useCurrentCologPermissionMock.mockReturnValue(undefined);

		render(<CologSettingsButton slug="rilog" />);

		expect(screen.queryByRole('button', { name: '팀 블로그 메뉴' })).not.toBeInTheDocument();
	});

	it('커버 이미지 위에서는 밝은 아이콘 색상을 사용한다', () => {
		useCurrentCologPermissionMock.mockReturnValue('OWNER');

		render(<CologSettingsButton slug="rilog" isOnCover />);

		expect(screen.getByRole('button', { name: '팀 블로그 메뉴' })).toHaveStyle({
			color: 'var(--text-on-dark)',
		});
	});
});
