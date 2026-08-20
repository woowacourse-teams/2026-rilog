import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CologSettingsAccessStatus } from '../hooks/use-colog-settings-access';

import CologSettingsAccessGuard from './CologSettingsAccessGuard';

const { replaceMock, useCologSettingsAccessMock } = vi.hoisted(() => ({
	replaceMock: vi.fn(),
	useCologSettingsAccessMock: vi.fn<() => CologSettingsAccessStatus>(),
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: replaceMock }),
}));

vi.mock('../hooks/use-colog-settings-access', () => ({
	useCologSettingsAccess: useCologSettingsAccessMock,
}));

describe('CologSettingsAccessGuard', () => {
	beforeEach(() => {
		replaceMock.mockReset();
		useCologSettingsAccessMock.mockReset();
	});

	it.each(['initializing', 'checking'] as const)('%s 상태에서는 설정 내용을 노출하지 않는다', (status) => {
		useCologSettingsAccessMock.mockReturnValue(status);

		render(
			<CologSettingsAccessGuard slug="rilog">
				<div>설정 내용</div>
			</CologSettingsAccessGuard>,
		);

		expect(screen.getByRole('status', { name: '코로그 설정 접근 권한 확인 중' })).toBeInTheDocument();
		expect(screen.queryByText('설정 내용')).not.toBeInTheDocument();
		expect(replaceMock).not.toHaveBeenCalled();
	});

	it('권한이 있으면 설정 내용을 렌더링한다', () => {
		useCologSettingsAccessMock.mockReturnValue('authorized');

		render(
			<CologSettingsAccessGuard slug="rilog">
				<div>설정 내용</div>
			</CologSettingsAccessGuard>,
		);

		expect(screen.getByText('설정 내용')).toBeInTheDocument();
		expect(replaceMock).not.toHaveBeenCalled();
	});

	it('인증되지 않았으면 로그인 필요 안내 후 코로그 홈으로 이동한다', async () => {
		const user = userEvent.setup();
		useCologSettingsAccessMock.mockReturnValue('unauthenticated');

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

	it('설정 권한이 없으면 권한 안내 후 코로그 홈으로 이동한다', async () => {
		const user = userEvent.setup();
		useCologSettingsAccessMock.mockReturnValue('forbidden');

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
		useCologSettingsAccessMock.mockReturnValue('error');

		render(
			<CologSettingsAccessGuard slug="rilog">
				<div>설정 내용</div>
			</CologSettingsAccessGuard>,
		);

		expect(screen.getByRole('alert')).toHaveTextContent('코로그 설정 접근 권한을 확인하지 못했습니다.');
		expect(screen.getByRole('link', { name: '코로그 홈으로 돌아가기' })).toHaveAttribute('href', '/@rilog');
		expect(screen.queryByText('설정 내용')).not.toBeInTheDocument();
		expect(replaceMock).not.toHaveBeenCalled();
	});

	it('권한이 사라지면 렌더링 중인 설정 내용을 제거하고 홈으로 이동한다', async () => {
		const user = userEvent.setup();
		useCologSettingsAccessMock.mockReturnValue('authorized');
		const { rerender } = render(
			<CologSettingsAccessGuard slug="rilog">
				<div>설정 내용</div>
			</CologSettingsAccessGuard>,
		);

		useCologSettingsAccessMock.mockReturnValue('forbidden');
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
