import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import BlogManagementMenu from './BlogManagementMenu';

describe('BlogManagementMenu', () => {
	it('미트볼 버튼으로 팝오버를 열고 바깥을 누르면 닫는다', async () => {
		const user = userEvent.setup();
		render(<BlogManagementMenu ariaLabel="블로그 메뉴" settingsHref="/@rilog/settings?tab=profile" showLeave />);
		const trigger = screen.getByRole('button', { name: '블로그 메뉴' });

		expect(trigger).toHaveAttribute('aria-expanded', 'false');
		await user.click(trigger);
		expect(trigger).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByRole('menu')).toBeInTheDocument();

		fireEvent.pointerDown(document.body);
		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
	});

	it('키보드로 메뉴 항목을 이동하고 Escape로 트리거에 복귀한다', async () => {
		const user = userEvent.setup();
		render(<BlogManagementMenu ariaLabel="블로그 메뉴" settingsHref="/@rilog/settings?tab=profile" showLeave />);
		const trigger = screen.getByRole('button', { name: '블로그 메뉴' });

		trigger.focus();
		await user.keyboard('{ArrowDown}');
		await waitFor(() => expect(screen.getByRole('menuitem', { name: '설정' })).toHaveFocus());
		await user.keyboard('{ArrowDown}');
		expect(screen.getByRole('menuitem', { name: '탈퇴' })).toHaveFocus();
		await user.keyboard('{Escape}');

		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
		expect(trigger).toHaveFocus();
	});

	it('탈퇴 옵션을 선택하면 팝오버를 닫고 탈퇴 요청을 전달한다', async () => {
		const user = userEvent.setup();
		const onLeave = vi.fn();
		render(<BlogManagementMenu ariaLabel="블로그 메뉴" showLeave onLeave={onLeave} />);

		await user.click(screen.getByRole('button', { name: '블로그 메뉴' }));
		await user.click(screen.getByRole('menuitem', { name: '탈퇴' }));

		expect(onLeave).toHaveBeenCalledOnce();
		expect(screen.queryByRole('menu')).not.toBeInTheDocument();
	});
});
