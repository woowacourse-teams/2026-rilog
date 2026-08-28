import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { createElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import { tokenManager } from '@/shared/api/auth/token-manager';

import * as authApi from '../api';

import { useLogoutMutation } from './use-logout-mutation';

const createWrapper = () => {
	const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });

	function TestQueryProviderWrapper({ children }: { children: ReactNode }) {
		return createElement(QueryClientProvider, { client: queryClient }, children);
	}

	return TestQueryProviderWrapper;
};

afterEach(() => {
	vi.restoreAllMocks();
});

describe('useLogoutMutation', () => {
	it('logout API 성공 후 logout 이벤트를 발행한다', async () => {
		vi.spyOn(authApi, 'logoutAuth').mockResolvedValue(new Response(null, { status: 204 }));
		const publishLogout = vi.spyOn(tokenManager, 'publishLogout').mockResolvedValue();
		const { result } = renderHook(() => useLogoutMutation(), { wrapper: createWrapper() });

		await result.current.mutateAsync();

		expect(publishLogout).toHaveBeenCalledOnce();
	});

	it('logout API 실패 후에도 logout 이벤트를 발행한다', async () => {
		const error = new Error('logout failed');
		vi.spyOn(authApi, 'logoutAuth').mockRejectedValue(error);
		const publishLogout = vi.spyOn(tokenManager, 'publishLogout').mockResolvedValue();
		const { result } = renderHook(() => useLogoutMutation(), { wrapper: createWrapper() });

		await expect(result.current.mutateAsync()).rejects.toThrow(error);
		expect(publishLogout).toHaveBeenCalledOnce();
	});
});
