import ky from 'ky';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { tokenManager } from './token-manager';

describe('tokenManager', () => {
	afterEach(() => vi.restoreAllMocks());
	beforeEach(async () => {
		await tokenManager.publishLogout();
	});

	it('초기 복구 실패와 명시적 로그아웃을 구분하면서 두 경우 모두 세션을 정리한다', async () => {
		vi.spyOn(ky, 'post').mockResolvedValue(new Response(null, { status: 401 }));
		const listener = vi.fn();
		const unsubscribe = tokenManager.subscribeLogout(listener);
		try {
			await expect(tokenManager.refresh()).resolves.toBeNull();
			expect(listener).toHaveBeenLastCalledWith('refresh-failed');
			await tokenManager.publishLogin('access-token');
			await tokenManager.publishLogout();
			expect(listener).toHaveBeenLastCalledWith('explicit');
			expect(tokenManager.getToken()).toBeNull();
		} finally {
			unsubscribe();
		}
	});

	it('setToken은 token만 교체하고 login 이벤트를 발행하지 않는다', () => {
		const listener = vi.fn();
		const unsubscribe = tokenManager.subscribeLogin(listener);

		tokenManager.setToken('refreshed-access-token');

		expect(tokenManager.getToken()).toBe('refreshed-access-token');
		expect(listener).not.toHaveBeenCalled();
		unsubscribe();
	});

	it('publishLogin은 token을 먼저 저장하고 비동기 login listener 완료를 기다린다', async () => {
		const listener = vi.fn(async () => {
			await Promise.resolve();
			expect(tokenManager.getToken()).toBe('access-token');
		});
		const unsubscribe = tokenManager.subscribeLogin(listener);

		await tokenManager.publishLogin('access-token');

		expect(listener).toHaveBeenCalledOnce();
		unsubscribe();
	});

	it('온보딩은 토큰 종류를 보존하고 정식 로그인 이벤트를 발행하지 않는다', async () => {
		const loginListener = vi.fn();
		const onboardingListener = vi.fn(async () => {
			await Promise.resolve();
			expect(tokenManager.getToken()).toBe('onboarding-token');
			expect(tokenManager.getTokenType()).toBe('onboarding');
		});
		const unsubscribeLogin = tokenManager.subscribeLogin(loginListener);
		const unsubscribeOnboarding = tokenManager.subscribeOnboarding(onboardingListener);

		try {
			await tokenManager.publishOnboarding('onboarding-token');
			expect(onboardingListener).toHaveBeenCalledOnce();
			expect(loginListener).not.toHaveBeenCalled();

			await tokenManager.publishLogin('access-token');
			expect(tokenManager.getTokenType()).toBe('access');
			expect(loginListener).toHaveBeenCalledOnce();

			await tokenManager.publishLogout();
			expect(tokenManager.getTokenType()).toBeNull();
		} finally {
			unsubscribeLogin();
			unsubscribeOnboarding();
		}
	});

	it('publishLogout은 token을 먼저 제거하고 비동기 logout listener 완료를 기다린다', async () => {
		tokenManager.setToken('access-token');
		const listener = vi.fn(async () => {
			await Promise.resolve();
			expect(tokenManager.getToken()).toBeNull();
		});
		const unsubscribe = tokenManager.subscribeLogout(listener);

		await tokenManager.publishLogout();

		expect(listener).toHaveBeenCalledOnce();
		unsubscribe();
	});

	it('listener 하나가 실패해도 나머지 listener를 실행하고 인증 전이를 유지한다', async () => {
		const error = new Error('listener failed');
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
		const unsubscribeFailedListener = tokenManager.subscribeLogin(() => Promise.reject(error));
		const successfulListener = vi.fn();
		const unsubscribeSuccessfulListener = tokenManager.subscribeLogin(successfulListener);

		await expect(tokenManager.publishLogin('access-token')).resolves.toBeUndefined();

		expect(tokenManager.getToken()).toBe('access-token');
		expect(successfulListener).toHaveBeenCalledOnce();
		expect(consoleError).toHaveBeenCalledWith('[TokenManager] Auth listener failed:', error);
		unsubscribeFailedListener();
		unsubscribeSuccessfulListener();
		consoleError.mockRestore();
	});
});
