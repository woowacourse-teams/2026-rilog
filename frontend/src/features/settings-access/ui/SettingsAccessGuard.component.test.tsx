import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BlogType } from '@/domains/blog/model/blog';
import type { SettingsAccessStatus } from '@/features/settings-access/hooks/use-settings-access';

import SettingsAccessGuard from './SettingsAccessGuard';

const { replaceMock, useSettingsAccessMock } = vi.hoisted(() => ({
	replaceMock: vi.fn(),
	useSettingsAccessMock: vi.fn<() => SettingsAccessStatus>(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock('@/features/settings-access/hooks/use-settings-access', () => ({ useSettingsAccess: useSettingsAccessMock }));

const renderGuard = (type: BlogType = 'RILOG', slug = 'rilogger') =>
	render(
		<SettingsAccessGuard type={type} slug={slug}>
			<div>설정 내용</div>
		</SettingsAccessGuard>,
	);

describe('SettingsAccessGuard', () => {
	beforeEach(() => {
		replaceMock.mockReset();
		useSettingsAccessMock.mockReset();
	});

	it.each<BlogType>(['RILOG', 'COLOG'])('%s 권한 검사에 type과 slug를 전달하고 허용된 내용을 렌더링한다', (type) => {
		useSettingsAccessMock.mockReturnValue('authorized');

		renderGuard(type, 'rilog');

		expect(useSettingsAccessMock).toHaveBeenCalledWith({ type, slug: 'rilog' });
		expect(screen.getByText('설정 내용')).toBeInTheDocument();
	});

	it.each(['initializing', 'checking'] as const)('%s 상태에서는 설정 내용을 노출하지 않는다', (status) => {
		useSettingsAccessMock.mockReturnValue(status);

		renderGuard();

		expect(screen.getByRole('status', { name: '설정 접근 권한 확인 중' })).toHaveTextContent(
			'설정 접근 권한을 확인하고 있습니다.',
		);
		expect(screen.queryByText('설정 내용')).not.toBeInTheDocument();
	});

	it('비로그인 접근은 로그인 안내 후 블로그 홈으로 이동한다', async () => {
		const user = userEvent.setup();
		useSettingsAccessMock.mockReturnValue('unauthenticated');

		renderGuard('RILOG', '@rilogger');

		expect(screen.getByRole('alertdialog', { name: '로그인이 필요한 페이지입니다.' })).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '확인' }));
		expect(replaceMock).toHaveBeenCalledWith('/@rilogger', { scroll: false });
	});

	it('권한이 없는 접근은 권한 안내 후 블로그 홈으로 이동한다', async () => {
		const user = userEvent.setup();
		useSettingsAccessMock.mockReturnValue('forbidden');

		renderGuard('COLOG', '@rilog');

		expect(screen.getByRole('alertdialog', { name: '접근 권한이 없는 페이지입니다.' })).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '확인' }));
		expect(replaceMock).toHaveBeenCalledWith('/@rilog', { scroll: false });
	});

	it('권한 조회가 실패하면 중립적인 오류와 복귀 수단을 제공한다', () => {
		useSettingsAccessMock.mockReturnValue('error');

		renderGuard('COLOG', 'rilog');

		expect(screen.getByRole('alert')).toHaveTextContent('설정 접근 권한을 확인하지 못했습니다.');
		expect(screen.getByRole('link', { name: '블로그 홈으로 돌아가기' })).toHaveAttribute('href', '/@rilog');
		expect(screen.queryByText('설정 내용')).not.toBeInTheDocument();
	});

	it('권한이 사라지면 렌더링 중인 설정 내용을 제거한다', async () => {
		const user = userEvent.setup();
		useSettingsAccessMock.mockReturnValue('authorized');
		const { rerender } = renderGuard('COLOG', 'rilog');

		useSettingsAccessMock.mockReturnValue('forbidden');
		rerender(
			<SettingsAccessGuard type="COLOG" slug="rilog">
				<div>설정 내용</div>
			</SettingsAccessGuard>,
		);

		expect(screen.queryByText('설정 내용')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '확인' }));
		await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/@rilog', { scroll: false }));
	});
});
