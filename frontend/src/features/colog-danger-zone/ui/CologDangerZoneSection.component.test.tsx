import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { APP_ROUTES } from '@/shared/routes/app-routes';

import CologDangerZoneSection from './CologDangerZoneSection';

const { deleteCologMock, replaceMock, resetDeleteCologMock, useDeleteCologMutationMock } = vi.hoisted(() => ({
	deleteCologMock: vi.fn(),
	replaceMock: vi.fn(),
	resetDeleteCologMock: vi.fn(),
	useDeleteCologMutationMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: replaceMock }),
}));

vi.mock('@/shared/api/cologs/mutations/use-delete-colog-mutation', () => ({
	useDeleteCologMutation: useDeleteCologMutationMock,
}));

describe('CologDangerZoneSection', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		deleteCologMock.mockImplementation((_slug: string, options?: { onSuccess?: () => void }) => {
			options?.onSuccess?.();
		});
		useDeleteCologMutationMock.mockReturnValue({
			isPending: false,
			mutate: deleteCologMock,
			reset: resetDeleteCologMock,
		});
	});

	it('팀 삭제의 영향과 되돌릴 수 없음을 안내한다', () => {
		render(<CologDangerZoneSection slug="team-rilog" />);

		expect(screen.getByRole('heading', { level: 2, name: '팀 삭제' })).toBeInTheDocument();
		expect(screen.getByText('팀과 팀의 게시글이 영구적으로 삭제됩니다.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '팀 영구 삭제' })).toBeInTheDocument();
	});

	it('팀 삭제 전에 취소할 수 있는 확인 모달을 제공한다', async () => {
		const user = userEvent.setup();
		render(<CologDangerZoneSection slug="team-rilog" />);

		await user.click(screen.getByRole('button', { name: '팀 영구 삭제' }));

		const dialog = screen.getByRole('dialog', { name: '팀을 영구 삭제할까요?' });
		expect(dialog).toHaveAccessibleDescription('삭제된 팀과 게시글은 복구할 수 없습니다.');
		await waitFor(() => expect(within(dialog).getByRole('button', { name: '취소' })).toHaveFocus());

		await user.click(within(dialog).getByRole('button', { name: '취소' }));
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: '팀을 영구 삭제할까요?' })).not.toBeInTheDocument(),
		);
	});

	it('확정하면 팀 삭제를 요청하고 피드로 이동한다', async () => {
		const user = userEvent.setup();
		render(<CologDangerZoneSection slug="@team-rilog" />);

		await user.click(screen.getByRole('button', { name: '팀 영구 삭제' }));
		await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '영구 삭제' }));

		const [requestedSlug, mutationOptions] = deleteCologMock.mock.calls[0] as [string, { onSuccess?: () => void }];
		expect(requestedSlug).toBe('@team-rilog');
		expect(mutationOptions.onSuccess).toBeTypeOf('function');
		expect(replaceMock).toHaveBeenCalledWith(APP_ROUTES.feeds);
		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: '팀을 영구 삭제할까요?' })).not.toBeInTheDocument(),
		);
	});
});
