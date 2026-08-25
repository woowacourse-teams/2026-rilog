import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import RilogSettingsWorkspace from './RilogSettingsWorkspace';

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }));

describe('RilogSettingsWorkspace', () => {
	it('프로필과 위험 영역을 탭·키보드로 전환하고 URL에 반영한다', async () => {
		const user = userEvent.setup();
		render(<RilogSettingsWorkspace slug="rilogger" />);

		const profileTab = screen.getByRole('tab', { name: '프로필' });
		expect(profileTab).toHaveAttribute('aria-selected', 'true');
		profileTab.focus();
		await user.keyboard('{End}');

		expect(screen.getByRole('tab', { name: '위험 영역' })).toHaveFocus();
		expect(screen.getByRole('heading', { name: '위험 영역' })).toBeInTheDocument();
		expect(window.location.pathname + window.location.search).toBe('/@rilogger/settings?tab=danger');
		expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'rilog-settings-tab-danger');
	});

	it('저장하지 않은 프로필은 탭 이동을 확인하고 취소하면 유지한다', async () => {
		const user = userEvent.setup();
		render(<RilogSettingsWorkspace slug="rilogger" />);

		const nickname = screen.getByRole('textbox', { name: '닉네임' });
		await user.clear(nickname);
		await user.type(nickname, '수정 중인 리로거');
		await user.click(screen.getByRole('tab', { name: '위험 영역' }));

		const dialog = screen.getByRole('dialog', { name: '변경 사항을 저장하지 않고 이동할까요?' });
		await user.click(within(dialog).getByRole('button', { name: '계속 수정' }));
		expect(screen.getByRole('textbox', { name: '닉네임' })).toHaveValue('수정 중인 리로거');
	});

	it('저장한 프로필은 확인 없이 탭을 이동하고 현재 세션의 값을 유지한다', async () => {
		const user = userEvent.setup();
		render(<RilogSettingsWorkspace slug="rilogger" />);

		const nickname = screen.getByRole('textbox', { name: '닉네임' });
		await user.clear(nickname);
		await user.type(nickname, '새 리로거');
		await user.click(screen.getByRole('button', { name: '닉네임 중복 확인' }));
		await user.click(screen.getByRole('button', { name: '변경사항 저장' }));
		await waitFor(() => expect(screen.queryByRole('button', { name: '변경사항 저장' })).not.toBeInTheDocument());

		await user.click(screen.getByRole('tab', { name: '위험 영역' }));
		expect(screen.queryByRole('dialog', { name: '변경 사항을 저장하지 않고 이동할까요?' })).not.toBeInTheDocument();
		await user.click(screen.getByRole('tab', { name: '프로필' }));
		expect(screen.getByRole('textbox', { name: '닉네임' })).toHaveValue('새 리로거');
	});
});
