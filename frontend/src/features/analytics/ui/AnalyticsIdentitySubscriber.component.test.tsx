import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AnalyticsIdentitySubscriber from './AnalyticsIdentitySubscriber';

const { identifyMock, resetMock, useMyInfoQueryMock, getTokenTypeMock } = vi.hoisted(() => ({
	getTokenTypeMock: vi.fn(),
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
		getTokenType: getTokenTypeMock,
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
		identifyMock.mockReturnValue(true);
		getTokenTypeMock.mockReturnValue('access');
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

	it('새 사용자 식별을 wrapper에 위임하고 로그아웃하면 identity를 초기화한다', () => {
		const { rerender } = render(<AnalyticsIdentitySubscriber />);
		useMyInfoQueryMock.mockReturnValue({
			data: { status: 200, message: 'OK', data: { id: 2, slug: 'next', nickname: '다음 사용자' } },
		});

		rerender(<AnalyticsIdentitySubscriber />);
		expect(resetMock).not.toHaveBeenCalled();
		expect(identifyMock).toHaveBeenLastCalledWith('2', { slug: 'next', nickname: '다음 사용자' });

		logoutListener?.();
		expect(resetMock).toHaveBeenCalledOnce();
	});

	it('식별 실패 후 동일한 내 정보를 다시 조회하면 재시도한다', () => {
		identifyMock.mockReturnValueOnce(false);
		const response = { data: { id: 1, slug: 'rilog', nickname: '리로그' } };
		useMyInfoQueryMock.mockReturnValue({ data: response, dataUpdatedAt: 1 });
		const { rerender } = render(<AnalyticsIdentitySubscriber />);
		useMyInfoQueryMock.mockReturnValue({ data: response, dataUpdatedAt: 2 });
		rerender(<AnalyticsIdentitySubscriber />);
		expect(identifyMock).toHaveBeenCalledTimes(2);
		useMyInfoQueryMock.mockReturnValue({ data: response, dataUpdatedAt: 3 });
		rerender(<AnalyticsIdentitySubscriber />);
		expect(identifyMock).toHaveBeenCalledTimes(2);
	});

	it('내 정보가 없으면 인증 흐름을 방해하지 않는다', () => {
		useMyInfoQueryMock.mockReturnValue({ data: undefined, isError: true });

		expect(() => render(<AnalyticsIdentitySubscriber />)).not.toThrow();
		expect(identifyMock).not.toHaveBeenCalled();
	});

	it('로그아웃 후 이전 내 정보가 렌더되어도 다시 식별하지 않는다', () => {
		const { rerender } = render(<AnalyticsIdentitySubscriber />);
		getTokenTypeMock.mockReturnValue(null);
		logoutListener?.();
		useMyInfoQueryMock.mockReturnValue({ data: { data: { id: 1, slug: 'rilog', nickname: '리로그' } } });
		rerender(<AnalyticsIdentitySubscriber />);
		expect(identifyMock).toHaveBeenCalledOnce();
		expect(resetMock).toHaveBeenCalledOnce();
	});
});
