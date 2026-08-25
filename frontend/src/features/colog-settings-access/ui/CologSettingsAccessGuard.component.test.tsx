import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SettingsAccessStatus } from '@/features/settings-access/hooks/use-settings-access';

import CologSettingsAccessGuard from './CologSettingsAccessGuard';

const { replaceMock, useSettingsAccessMock } = vi.hoisted(() => ({
	replaceMock: vi.fn(),
	useSettingsAccessMock: vi.fn<() => SettingsAccessStatus>(),
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: replaceMock }),
}));

vi.mock('@/features/settings-access/hooks/use-settings-access', () => ({
	useSettingsAccess: useSettingsAccessMock,
}));

describe('CologSettingsAccessGuard', () => {
	beforeEach(() => {
		replaceMock.mockReset();
		useSettingsAccessMock.mockReset();
	});

	it.each(['initializing', 'checking'] as const)('%s 상태에서는 설정 내용을 노출하지 않는다', (status) => {
		useSettingsAccessMock.mockReturnValue(status);

		render(
			<CologSettingsAccessGuard slug="rilog">
				<div>설정 내용</div>
			</CologSettingsAccessGuard>,
		);

		expect(screen.getByRole('status', { name: '팀 설정 접근 권한 확인 중' })).toBeInTheDocument();
		expect(screen.queryByText('설정 내용')).not.toBeInTheDocument();
		expect(replaceMock).not.toHaveBeenCalled();
	});

	it('권한이 있으면 설정 내용을 렌더링한다', () => {
		useSettingsAccessMock.mockReturnValue('authorized');

		render(
			<CologSettingsAccessGuard slug="rilog">
				<div>설정 내용</div>
			</CologSettingsAccessGuard>,
		);

		expect(screen.getByText('설정 내용')).toBeInTheDocument();
		expect(replaceMock).not.toHaveBeenCalled();
	});

	it('인증되지 않았으면 로그인 필요 안내 후 팀 홈으로 이동한다', async () => {
		const user = userEvent.setup();
		useSettingsAccessMock.mockReturnValue('unauthenticated');

		render(
			<CologSettingsAccessGuard slug="@rilog">
				<div>설정 내용</div>
			</CologSettingsAccessGuard>,
		);

		expect(screen.queryByText('설정 내용')).not.toBeInTheDocument();
		expect(screen.getByRole('alertdialog', { name: '로그인이 필요한 페이지입니다.' })).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '확인' }));
		expect(replaceMock).toHaveBeenCalledWith('/@rilog', { scroll: false });
	});

	it('설정 권한이 없으면 권한 안내 후 팀 홈으로 이동한다', async () => {
		const user = userEvent.setup();
		useSettingsAccessMock.mockReturnValue('forbidden');

		render(
			<CologSettingsAccessGuard slug="@rilog">
				<div>설정 내용</div>
			</CologSettingsAccessGuard>,
		);

		expect(screen.queryByText('설정 내용')).not.toBeInTheDocument();
		expect(screen.getByRole('alertdialog', { name: '접근 권한이 없는 페이지입니다.' })).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '확인' }));
		expect(replaceMock).toHaveBeenCalledWith('/@rilog', { scroll: false });
	});

	it('권한 조회가 실패하면 설정 내용을 숨기고 복귀 수단을 제공한다', () => {
		useSettingsAccessMock.mockReturnValue('error');

		render(
			<CologSettingsAccessGuard slug="rilog">
				<div>설정 내용</div>
			</CologSettingsAccessGuard>,
		);

		expect(screen.getByRole('alert')).toHaveTextContent('팀 설정 접근 권한을 확인하지 못했습니다.');
		expect(screen.getByRole('link', { name: '팀 홈으로 돌아가기' })).toHaveAttribute('href', '/@rilog');
		expect(screen.queryByText('설정 내용')).not.toBeInTheDocument();
		expect(replaceMock).not.toHaveBeenCalled();
	});

	it('권한이 사라지면 렌더링 중인 설정 내용을 제거하고 홈으로 이동한다', async () => {
		const user = userEvent.setup();
		useSettingsAccessMock.mockReturnValue('authorized');
		const { rerender } = render(
			<CologSettingsAccessGuard slug="rilog">
				<div>설정 내용</div>
			</CologSettingsAccessGuard>,
		);

		useSettingsAccessMock.mockReturnValue('forbidden');
		rerender(
			<CologSettingsAccessGuard slug="rilog">
				<div>설정 내용</div>
			</CologSettingsAccessGuard>,
		);

		expect(screen.queryByText('설정 내용')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '확인' }));
		await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/@rilog', { scroll: false }));
	});
});
