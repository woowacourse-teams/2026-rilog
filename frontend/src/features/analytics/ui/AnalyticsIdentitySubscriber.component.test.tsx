import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AnalyticsIdentitySubscriber from './AnalyticsIdentitySubscriber';

const { identifyMock, resetMock, useMyInfoQueryMock } = vi.hoisted(() => ({
	identifyMock: vi.fn(),
	resetMock: vi.fn(),
	useMyInfoQueryMock: vi.fn(),
}));

let logoutListener: (() => void) | undefined;

vi.mock('@/shared/analytics/posthog', () => ({
	identifyAnalyticsUser: identifyMock,
	resetAnalyticsIdentity: resetMock,
}));

vi.mock('@/shared/api/auth/token-manager', () => ({
	tokenManager: {
		subscribeLogout: (listener: () => void) => {
			logoutListener = listener;
			return vi.fn();
		},
	},
}));

vi.mock('@/shared/api/users/queries/my-info/use-query', () => ({
	useMyInfoQuery: useMyInfoQueryMock,
}));

describe('AnalyticsIdentitySubscriber', () => {
	beforeEach(() => {
		logoutListener = undefined;
		vi.clearAllMocks();
		useMyInfoQueryMock.mockReturnValue({
			data: { status: 200, message: 'OK', data: { id: 1, slug: 'rilog', nickname: '리로그' } },
		});
	});

	it('로그인 사용자를 한 번 식별하고 같은 사용자에는 반복 호출하지 않는다', () => {
		const { rerender } = render(<AnalyticsIdentitySubscriber />);

		expect(identifyMock).toHaveBeenCalledWith('1', { slug: 'rilog', nickname: '리로그' });
		rerender(<AnalyticsIdentitySubscriber />);
		expect(identifyMock).toHaveBeenCalledOnce();
	});

	it('사용자가 바뀌거나 로그아웃하면 identity를 초기화한다', () => {
		const { rerender } = render(<AnalyticsIdentitySubscriber />);
		useMyInfoQueryMock.mockReturnValue({
			data: { status: 200, message: 'OK', data: { id: 2, slug: 'next', nickname: '다음 사용자' } },
		});

		rerender(<AnalyticsIdentitySubscriber />);
		expect(resetMock).toHaveBeenCalledOnce();
		expect(identifyMock).toHaveBeenLastCalledWith('2', { slug: 'next', nickname: '다음 사용자' });

		logoutListener?.();
		expect(resetMock).toHaveBeenCalledTimes(2);
	});

	it('내 정보가 없으면 인증 흐름을 방해하지 않는다', () => {
		useMyInfoQueryMock.mockReturnValue({ data: undefined, isError: true });

		expect(() => render(<AnalyticsIdentitySubscriber />)).not.toThrow();
		expect(identifyMock).not.toHaveBeenCalled();
	});
});
