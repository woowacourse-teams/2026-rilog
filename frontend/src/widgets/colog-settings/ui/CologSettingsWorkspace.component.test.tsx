import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Link from 'next/link';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CologSettingsWorkspace from './CologSettingsWorkspace';

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: replaceMock }),
}));

describe('CologSettingsWorkspace', () => {
	beforeEach(() => {
		replaceMock.mockClear();
	});

	it('멤버 관리 탭을 기본으로 표시한다', () => {
		render(<CologSettingsWorkspace />);

		expect(screen.getByRole('tab', { name: '멤버 관리' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('heading', { name: '멤버 관리' })).toBeInTheDocument();
		expect(screen.getByRole('table', { name: '코로그 멤버 목록' })).toBeInTheDocument();
		expect(screen.getAllByRole('row')).toHaveLength(7);
		expect(
			within(screen.getByRole('table', { name: '코로그 멤버 목록' }))
				.getAllByRole('columnheader')
				.map((header) => header.textContent),
		).toEqual(['멤버', '권한', '역할', '가입일', '멤버 작업']);
	});

	it('탭을 선택하면 해당 설정 내용을 조건부 렌더링한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace />);

		await user.click(screen.getByRole('tab', { name: '프로필' }));

		expect(screen.getByRole('tab', { name: '프로필' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('heading', { name: '프로필' })).toBeInTheDocument();
		expect(screen.queryByRole('table', { name: '코로그 멤버 목록' })).not.toBeInTheDocument();
	});

	it('방향키로 다음 탭에 이동한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace />);

		const memberTab = screen.getByRole('tab', { name: '멤버 관리' });
		memberTab.focus();
		await user.keyboard('{ArrowRight}');

		expect(screen.getByRole('tab', { name: '위험 영역' })).toHaveFocus();
		expect(screen.getByRole('heading', { name: '위험 영역' })).toBeInTheDocument();
	});

	it('모든 멤버의 권한과 역할을 수정하고 저장한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace />);

		await user.click(screen.getByRole('button', { name: '멤버 정보 수정' }));

		expect(screen.getAllByRole('combobox')).toHaveLength(6);
		expect(screen.getAllByRole('textbox')).toHaveLength(6);
		expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();

		await user.selectOptions(screen.getByRole('combobox', { name: '김지연 권한' }), 'ADMIN');
		const roleInput = screen.getByRole('textbox', { name: '김지연 역할' });
		await user.clear(roleInput);
		await user.type(roleInput, '프로덕트 오너');
		await user.click(screen.getByRole('button', { name: '저장' }));

		const memberRow = screen.getByRole('row', { name: /김지연/ });
		expect(memberRow).toHaveTextContent('Admin');
		expect(memberRow).toHaveTextContent('프로덕트 오너');
		expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
	});

	it('멤버 정보 수정을 취소하면 기존 값을 유지한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace />);

		await user.click(screen.getByRole('button', { name: '멤버 정보 수정' }));
		await user.selectOptions(screen.getByRole('combobox', { name: '김지연 권한' }), 'MEMBER');
		await user.click(screen.getByRole('button', { name: '취소' }));

		const memberRow = screen.getByRole('row', { name: /김지연/ });
		expect(memberRow).toHaveTextContent('Owner');
		expect(memberRow).not.toHaveTextContent('Member');
	});

	it('실제로 변경된 멤버가 있을 때만 저장할 수 있다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace />);

		await user.click(screen.getByRole('button', { name: '멤버 정보 수정' }));
		const saveButton = screen.getByRole('button', { name: '저장' });
		const permissionSelect = screen.getByRole('combobox', { name: '김지연 권한' });

		expect(saveButton).toBeDisabled();

		await user.selectOptions(permissionSelect, 'ADMIN');
		expect(saveButton).toBeEnabled();

		await user.selectOptions(permissionSelect, 'OWNER');
		expect(saveButton).toBeDisabled();
	});

	it('수정 사항이 있으면 탭 이동을 확인하고 취소하거나 계속한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace />);

		await user.click(screen.getByRole('button', { name: '멤버 정보 수정' }));
		const permissionSelect = screen.getByRole('combobox', { name: '김지연 권한' });
		await user.selectOptions(permissionSelect, 'ADMIN');
		await user.click(screen.getByRole('tab', { name: '프로필' }));

		const leaveDialog = screen.getByRole('dialog', { name: '변경 사항을 저장하지 않고 이동할까요?' });
		expect(screen.getByRole('tab', { name: '멤버 관리' })).toHaveAttribute('aria-selected', 'true');

		await user.click(within(leaveDialog).getByRole('button', { name: '계속 수정' }));
		expect(permissionSelect).toHaveValue('ADMIN');
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: '변경 사항을 저장하지 않고 이동할까요?' })).not.toBeInTheDocument(),
		);

		await user.click(screen.getByRole('tab', { name: '프로필' }));
		await user.click(screen.getByRole('button', { name: '이동' }));

		expect(screen.getByRole('tab', { name: '프로필' })).toHaveAttribute('aria-selected', 'true');
		expect(screen.getByRole('heading', { name: '프로필' })).toBeInTheDocument();
	});

	it('수정 사항이 있으면 내부 페이지 이동을 확인한다', async () => {
		const user = userEvent.setup();
		render(
			<>
				<Link href="/co-logs/rilog">코로그로 돌아가기</Link>
				<CologSettingsWorkspace />
			</>,
		);

		await user.click(screen.getByRole('button', { name: '멤버 정보 수정' }));
		await user.selectOptions(screen.getByRole('combobox', { name: '김지연 권한' }), 'ADMIN');
		await user.click(screen.getByRole('link', { name: '코로그로 돌아가기' }));

		expect(screen.getByRole('dialog', { name: '변경 사항을 저장하지 않고 이동할까요?' })).toBeInTheDocument();
		expect(replaceMock).not.toHaveBeenCalled();

		await user.click(screen.getByRole('button', { name: '이동' }));
		await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/co-logs/rilog'));
	});

	it('수정 사항이 있을 때만 beforeunload 기본 경고를 요청한다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace />);

		await user.click(screen.getByRole('button', { name: '멤버 정보 수정' }));
		const permissionSelect = screen.getByRole('combobox', { name: '김지연 권한' });
		await user.selectOptions(permissionSelect, 'ADMIN');

		const dirtyBeforeUnloadEvent = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(dirtyBeforeUnloadEvent);
		expect(dirtyBeforeUnloadEvent.defaultPrevented).toBe(true);

		await user.selectOptions(permissionSelect, 'OWNER');
		const cleanBeforeUnloadEvent = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(cleanBeforeUnloadEvent);
		expect(cleanBeforeUnloadEvent.defaultPrevented).toBe(false);
	});

	it('멤버 초대 버튼으로 초대 모달을 연다', async () => {
		const user = userEvent.setup();
		render(<CologSettingsWorkspace />);

		await user.click(screen.getByRole('button', { name: '+ 멤버 초대' }));

		expect(screen.getByRole('dialog', { name: '멤버 초대' })).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: '초대할 멤버 고유 아이디' })).toHaveFocus();
	});
});
