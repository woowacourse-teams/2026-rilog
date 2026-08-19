import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createElement } from 'react';

import type { RenderOptions } from '@testing-library/react';
import type { ReactNode } from 'react';


/** 테스트용 QueryClient — 재시도 없이 즉시 실패하도록 설정합니다. */
export const createTestQueryClient = () =>
	new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});

interface WrapperProps {
	children: ReactNode;
}

/** QueryClientProvider가 필요한 컴포넌트를 렌더할 때 사용합니다. */
export const renderWithQuery = (ui: ReactNode, options?: Omit<RenderOptions, 'wrapper'>) => {
	const queryClient = createTestQueryClient();

	function Wrapper({ children }: WrapperProps) {
		return createElement(QueryClientProvider, { client: queryClient }, children);
	}

	return { queryClient, ...render(ui, { wrapper: Wrapper, ...options }) };
};
