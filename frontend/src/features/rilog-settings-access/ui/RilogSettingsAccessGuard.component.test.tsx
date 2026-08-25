import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SettingsAccessStatus } from '@/features/settings-access/hooks/use-settings-access';

import RilogSettingsAccessGuard from './RilogSettingsAccessGuard';

const { replaceMock, useSettingsAccessMock } = vi.hoisted(() => ({
	replaceMock: vi.fn(),
	useSettingsAccessMock: vi.fn<() => SettingsAccessStatus>(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock('@/features/settings-access/hooks/use-settings-access', () => ({ useSettingsAccess: useSettingsAccessMock }));

describe('RilogSettingsAccessGuard', () => {
	beforeEach(() => {
		replaceMock.mockReset();
		useSettingsAccessMock.mockReset();
	});

	it('본인에게만 설정 내용을 렌더링한다', () => {
		useSettingsAccessMock.mockReturnValue('authorized');
		render(
			<RilogSettingsAccessGuard slug="rilogger">
				<div>개인 설정 내용</div>
			</RilogSettingsAccessGuard>,
		);
		expect(screen.getByText('개인 설정 내용')).toBeInTheDocument();
	});

	it('비로그인 접근은 로그인 안내를 제공한다', async () => {
		const user = userEvent.setup();
		useSettingsAccessMock.mockReturnValue('unauthenticated');
		render(
			<RilogSettingsAccessGuard slug="rilogger">
				<div>개인 설정 내용</div>
			</RilogSettingsAccessGuard>,
		);
		expect(screen.queryByText('개인 설정 내용')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '확인' }));
		expect(replaceMock).toHaveBeenCalledWith('/@rilogger', { scroll: false });
	});

	it('타인 접근은 권한 없음 안내를 제공한다', async () => {
		const user = userEvent.setup();
		useSettingsAccessMock.mockReturnValue('forbidden');
		render(
			<RilogSettingsAccessGuard slug="rilogger">
				<div>개인 설정 내용</div>
			</RilogSettingsAccessGuard>,
		);
		expect(screen.getByRole('alertdialog', { name: '접근 권한이 없는 페이지입니다.' })).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '확인' }));
		expect(replaceMock).toHaveBeenCalledWith('/@rilogger', { scroll: false });
	});

	it('조회 오류와 확인 중 상태에서는 설정을 숨긴다', () => {
		useSettingsAccessMock.mockReturnValue('error');
		const { rerender } = render(
			<RilogSettingsAccessGuard slug="rilogger">
				<div>개인 설정 내용</div>
			</RilogSettingsAccessGuard>,
		);
		expect(screen.getByRole('alert')).toHaveTextContent('개인 설정 접근 권한을 확인하지 못했습니다.');
		expect(screen.getByRole('link', { name: '개인 블로그로 돌아가기' })).toHaveAttribute('href', '/@rilogger');

		useSettingsAccessMock.mockReturnValue('checking');
		rerender(
			<RilogSettingsAccessGuard slug="rilogger">
				<div>개인 설정 내용</div>
			</RilogSettingsAccessGuard>,
		);
		expect(screen.getByRole('status', { name: '개인 설정 접근 권한 확인 중' })).toBeInTheDocument();
	});
});
