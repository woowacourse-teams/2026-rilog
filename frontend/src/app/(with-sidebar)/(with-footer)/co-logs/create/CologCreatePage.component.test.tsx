import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CologCreatePage from './page';

vi.mock('next/navigation', () => ({
	useRouter: () => ({ back: vi.fn() }),
}));

describe('CologCreatePage', () => {
	it('팀 생성 페이지의 목적을 안내한다', () => {
		const queryClient = new QueryClient();
		render(<QueryClientProvider client={queryClient}><CologCreatePage /></QueryClientProvider>);

		expect(screen.getByRole('heading', { name: '팀 생성' })).toBeInTheDocument();
		expect(screen.getByText('함께 기록할 팀의 기본 정보와 소개를 입력해 주세요.')).toBeInTheDocument();
	});
});
