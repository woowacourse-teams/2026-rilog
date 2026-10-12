import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import { useNotificationUnreadCountQuery } from '@/shared/api/notifications/queries/unread-count/use-query';
import { renderWithQuery } from '@/test/render-with-query';

const { readCount, getToken } = vi.hoisted(() => ({
	readCount: vi.fn(),
	getToken: vi.fn(),
}));

vi.mock('@/shared/api/notifications/api', () => ({ readNotificationUnreadCount: readCount }));
vi.mock('@/shared/api/auth/token-manager', () => ({ tokenManager: { getToken } }));

function CountStatus() {
	const query = useNotificationUnreadCountQuery();
	return <p>{query.data?.data?.unreadCount ?? '없음'}</p>;
}

function renderCount(isAuthenticated: boolean, isInitialized = true) {
	return renderWithQuery(
		<AUTH_CONTEXT.Provider value={{ isAuthenticated, isInitialized, isOnboarding: false }}>
			<CountStatus />
		</AUTH_CONTEXT.Provider>,
	);
}

afterEach(() => {
	vi.clearAllMocks();
});

describe('useNotificationUnreadCountQuery', () => {
	it('인증 초기화 전이나 비로그인 상태에는 요청하지 않는다', () => {
		getToken.mockReturnValue('access-token');
		renderCount(true, false);
		renderCount(false);

		expect(readCount).not.toHaveBeenCalled();
	});

	it('인증 상태여도 토큰이 없으면 요청하지 않는다', () => {
		getToken.mockReturnValue(null);
		renderCount(true);

		expect(readCount).not.toHaveBeenCalled();
	});

	it('인증과 토큰이 모두 있으면 수를 조회한다', async () => {
		getToken.mockReturnValue('access-token');
		readCount.mockResolvedValue({ status: 0, message: 'OK', data: { unreadCount: 4 } });
		renderCount(true);

		await waitFor(() => expect(screen.getByText('4')).toBeInTheDocument());
		expect(readCount).toHaveBeenCalledOnce();
	});
});
