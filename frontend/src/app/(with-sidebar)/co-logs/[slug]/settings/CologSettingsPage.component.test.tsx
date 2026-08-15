import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import CologSettingsPage from './page';

vi.mock('next/navigation', () => ({
	useRouter: () => ({ replace: vi.fn() }),
}));

describe('CologSettingsPage', () => {
	it('페이지 헤더와 설정 콘텐츠를 각각의 landmark에 배치한다', async () => {
		const page = await CologSettingsPage({ params: Promise.resolve({ slug: 'rilog' }) });

		render(page);

		const header = screen.getByRole('banner');
		const main = screen.getByRole('main');

		expect(within(header).getByRole('link', { name: '코로그로 돌아가기' })).toHaveAttribute('href', '/co-logs/rilog');
		expect(within(main).getByRole('tablist', { name: '팀 설정' })).toBeInTheDocument();
		expect(within(main).getByRole('table', { name: '코로그 멤버 목록' })).toBeInTheDocument();
	});
});
