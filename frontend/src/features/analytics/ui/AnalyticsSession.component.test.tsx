import { act, render } from '@testing-library/react';
import ky from 'ky';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { tokenManager } from '@/shared/api/auth/token-manager';

import AnalyticsIdentitySubscriber from './AnalyticsIdentitySubscriber';

const { sdk, identity, useMyInfoQueryMock } = vi.hoisted(() => ({
	identity: { distinctId: 'anonymous-before-oauth', userId: undefined as string | undefined },
	sdk: { identify: vi.fn(), reset: vi.fn(), get_property: vi.fn() },
	useMyInfoQueryMock: vi.fn(),
}));

vi.mock('posthog-js', () => ({ default: sdk }));
vi.mock('@/shared/api/users/queries/my-info/use-query', () => ({ useMyInfoQuery: useMyInfoQueryMock }));

describe('인증 복구와 분석 identity 연결', () => {
	beforeEach(async () => {
		await tokenManager.publishLogout();
		vi.clearAllMocks();
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN', 'test-token');
		vi.stubEnv('NEXT_PUBLIC_POSTHOG_HOST', 'https://us.i.posthog.com');
		vi.spyOn(ky, 'post').mockResolvedValue(new Response(null, { status: 401 }));
		identity.distinctId = 'anonymous-before-oauth';
		identity.userId = undefined;
		useMyInfoQueryMock.mockReturnValue({ data: undefined });
		sdk.get_property.mockImplementation(() => identity.userId);
		sdk.reset.mockImplementation(() => {
			identity.distinctId = 'anonymous-after-reset';
			identity.userId = undefined;
		});
		sdk.identify.mockImplementation((userId: string) => {
			identity.userId = userId;
			identity.distinctId = userId;
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.unstubAllEnvs();
	});

	it('익명 초기 복구와 OAuth 복귀 후 복구 실패에도 같은 ID로 식별하고 명시적 로그아웃 시 초기화한다', async () => {
		const firstVisit = render(<AnalyticsIdentitySubscriber />);
		await act(async () => {
			await tokenManager.refresh();
		});
		expect(identity.distinctId).toBe('anonymous-before-oauth');
		firstVisit.unmount();

		// 전체 페이지 이동 이후에도 SDK의 저장된 identity는 남고 React ref는 새로 생성된다.
		const callbackVisit = render(<AnalyticsIdentitySubscriber />);
		await act(async () => {
			await tokenManager.refresh();
		});
		expect(identity.distinctId).toBe('anonymous-before-oauth');
		expect(sdk.reset).not.toHaveBeenCalled();
		useMyInfoQueryMock.mockReturnValue({ data: { data: { id: 42, slug: 'rilog', nickname: '리로그' } } });
		callbackVisit.rerender(<AnalyticsIdentitySubscriber />);
		expect(sdk.identify).toHaveBeenCalledWith('42', { slug: 'rilog', nickname: '리로그' });
		expect(identity.distinctId).toBe('42');

		await act(async () => {
			await tokenManager.publishLogout();
		});
		expect(sdk.reset).toHaveBeenCalledOnce();
		expect(identity.distinctId).toBe('anonymous-after-reset');
	});

	it('이전 페이지에서 식별된 사용자는 내 정보 조회 전 복구에 실패해도 연결을 해제한다', async () => {
		identity.userId = '42';
		identity.distinctId = '42';
		render(<AnalyticsIdentitySubscriber />);
		await act(async () => {
			await tokenManager.refresh();
		});
		expect(sdk.reset).toHaveBeenCalledOnce();
		expect(identity.userId).toBeUndefined();
		await act(async () => {
			await tokenManager.refresh();
		});
		expect(sdk.reset).toHaveBeenCalledOnce();
	});
});
