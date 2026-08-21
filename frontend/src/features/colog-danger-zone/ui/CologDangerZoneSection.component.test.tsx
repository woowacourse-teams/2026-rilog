import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import CologDangerZoneSection from './CologDangerZoneSection';

describe('CologDangerZoneSection', () => {
	it('팀 삭제의 영향과 되돌릴 수 없음을 안내한다', () => {
		render(<CologDangerZoneSection />);

		expect(screen.getByRole('heading', { level: 2, name: '팀 삭제' })).toBeInTheDocument();
		expect(screen.getByText(/게시글은 작성자 개인 글로 전환/)).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '팀 영구 삭제' })).toBeInTheDocument();
	});

	it('팀 삭제 전에 취소할 수 있는 확인 모달을 제공한다', async () => {
		const user = userEvent.setup();
		render(<CologDangerZoneSection />);

		await user.click(screen.getByRole('button', { name: '팀 영구 삭제' }));

		const dialog = screen.getByRole('dialog', { name: '팀을 영구 삭제할까요?' });
		expect(dialog).toHaveAccessibleDescription('삭제된 팀과 설정은 복구할 수 없습니다.');
		await waitFor(() => expect(within(dialog).getByRole('button', { name: '취소' })).toHaveFocus());

		await user.click(within(dialog).getByRole('button', { name: '취소' }));
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: '팀을 영구 삭제할까요?' })).not.toBeInTheDocument(),
		);
	});

	it('확정하면 팀 삭제를 요청하고 모달을 닫는다', async () => {
		const user = userEvent.setup();
		const onDeleteTeam = vi.fn();
		render(<CologDangerZoneSection onDeleteTeam={onDeleteTeam} />);

		await user.click(screen.getByRole('button', { name: '팀 영구 삭제' }));
		await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '영구 삭제' }));

		expect(onDeleteTeam).toHaveBeenCalledOnce();
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: '팀을 영구 삭제할까요?' })).not.toBeInTheDocument(),
		);
	});
});
