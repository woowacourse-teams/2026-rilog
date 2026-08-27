import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import RilogDangerZoneSection from './RilogDangerZoneSection';

describe('RilogDangerZoneSection', () => {
	it('탈퇴 안내와 확인 모달을 제공하고 확정 시 목 callback만 호출한다', async () => {
		const user = userEvent.setup();
		const onWithdraw = vi.fn();
		render(<RilogDangerZoneSection onWithdraw={onWithdraw} />);

		await user.click(screen.getByRole('button', { name: '계정 탈퇴' }));
		const dialog = screen.getByRole('dialog', { name: '계정을 탈퇴할까요?' });
		expect(dialog).toHaveAccessibleDescription('탈퇴 후에는 계정과 개인 설정을 복구할 수 없습니다.');
		await user.click(within(dialog).getByRole('button', { name: '탈퇴' }));

		expect(onWithdraw).toHaveBeenCalledOnce();
		await waitFor(() => expect(screen.queryByRole('dialog', { name: '계정을 탈퇴할까요?' })).not.toBeInTheDocument());
	});
});
