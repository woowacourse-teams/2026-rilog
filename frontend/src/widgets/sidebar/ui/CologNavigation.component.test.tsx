import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/render-with-query';

import CologNavigation from './CologNavigation';

const { myCologsQuery, recordCologCreationEntryContextMock } = vi.hoisted(() => ({
	myCologsQuery: {
		current: {
			data: [
				{ id: 1, slug: 'test-colog', name: '테스트 코로그', logoUrl: null },
				{ id: 2, slug: 'another-colog', name: '다른 코로그', logoUrl: null },
			] as Array<{ id: number; slug: string; name: string; logoUrl: string | null }> | undefined,
			isPending: false,
			isError: false,
			isFetching: false,
		},
	},
	recordCologCreationEntryContextMock: vi.fn(),
}));
const route = vi.hoisted(() => ({ pathname: '/feeds' }));

vi.mock('next/navigation', () => ({ usePathname: () => route.pathname }));

vi.mock('@/features/analytics/lib/colog-creation-entry-context', () => ({
	recordCologCreationEntryContext: recordCologCreationEntryContextMock,
}));

vi.mock('@/shared/api/users/queries/my-cologs-overview/use-query', () => ({
	useMyCologsOverviewQuery: vi.fn(() => ({ ...myCologsQuery.current })),
}));

describe('CologNavigation', () => {
	beforeEach(() => {
		route.pathname = '/feeds';
		myCologsQuery.current = {
			data: [
				{ id: 1, slug: 'test-colog', name: '테스트 코로그', logoUrl: null },
				{ id: 2, slug: 'another-colog', name: '다른 코로그', logoUrl: null },
			],
			isPending: false,
			isError: false,
			isFetching: false,
		};
	});

	it('현재 코로그 홈 링크만 활성화한다', () => {
		route.pathname = '/@test-colog';
		renderWithQuery(<CologNavigation />);

		expect(screen.getByRole('link', { name: '테스트 코로그' })).toHaveAttribute('aria-current', 'page');
		expect(screen.getByRole('link', { name: '다른 코로그' })).not.toHaveAttribute('aria-current');
	});

	it.each(['/@test-colog/posts/1', '/@test-colog/settings'])('%s에서 현재 코로그 링크를 활성화한다', (pathname) => {
		route.pathname = pathname;
		renderWithQuery(<CologNavigation />);

		expect(screen.getByRole('link', { name: '테스트 코로그' })).toHaveAttribute('aria-current', 'page');
		expect(screen.getByRole('link', { name: '다른 코로그' })).not.toHaveAttribute('aria-current');
	});

	it.each(['/@test-colog-team', '/@not-owned', '/feeds'])(
		'%s에서 slug prefix가 겹치는 코로그 링크를 활성화하지 않는다',
		(pathname) => {
			route.pathname = pathname;
			renderWithQuery(<CologNavigation />);

			expect(screen.getAllByRole('link').every((link) => !link.hasAttribute('aria-current'))).toBe(true);
		},
	);

	it('경로가 바뀌면 활성 코로그를 전환한다', () => {
		route.pathname = '/@test-colog';
		const { rerender } = renderWithQuery(<CologNavigation />);

		route.pathname = '/@another-colog';
		rerender(<CologNavigation />);

		expect(screen.getByRole('link', { name: '테스트 코로그' })).not.toHaveAttribute('aria-current');
		expect(screen.getByRole('link', { name: '다른 코로그' })).toHaveAttribute('aria-current', 'page');
	});

	it('내 팀 링크와 생성 링크를 제공한다', () => {
		renderWithQuery(<CologNavigation />);

		const navigation = screen.getByRole('navigation');
		const cologLinks = within(navigation).getAllByRole('link');

		expect(cologLinks.length).toBeGreaterThan(0);
		cologLinks.forEach((link) => {
			expect(link).toHaveAttribute('href');
			expect(link).toHaveAccessibleName();
		});
		expect(within(navigation).getByRole('link', { name: '팀 만들기' })).toHaveAttribute('href', '/colog/create');
	});

	it('키보드로 팀 링크와 생성 링크에 접근한다', async () => {
		const user = userEvent.setup();
		renderWithQuery(<CologNavigation />);
		const navigation = screen.getByRole('navigation');
		const cologLinks = within(navigation).getAllByRole('link');
		const createLink = within(navigation).getByRole('link', { name: '팀 만들기' });

		await user.tab();
		expect(cologLinks[0]).toHaveFocus();

		for (let index = 1; index < cologLinks.length - 1; index += 1) {
			await user.tab();
		}
		await user.tab();
		expect(createLink).toHaveFocus();
	});

	it('팀 만들기 진입을 sidebar source로 기록한다', async () => {
		const user = userEvent.setup();
		renderWithQuery(<CologNavigation />);

		await user.click(screen.getByRole('link', { name: '팀 만들기' }));

		expect(recordCologCreationEntryContextMock).toHaveBeenCalledWith('sidebar');
	});

	it('내 팀을 불러오는 중인 상태를 빈 목록과 구분한다', () => {
		myCologsQuery.current = {
			data: undefined,
			isPending: true,
			isError: false,
			isFetching: true,
		};

		renderWithQuery(<CologNavigation />);

		expect(screen.getByRole('status', { name: '내 팀을 불러오는 중' })).toBeInTheDocument();
		expect(screen.getByRole('status').querySelectorAll('.animate-pulse')).toHaveLength(2);
		expect(screen.queryByText('아직 소속된 Colog가 없어요.')).not.toBeInTheDocument();
	});

	it('내 팀 조회가 실패하면 느낌표 아이콘과 안내를 표시한다', () => {
		myCologsQuery.current = {
			data: undefined,
			isPending: false,
			isError: true,
			isFetching: false,
		};
		renderWithQuery(<CologNavigation />);

		expect(screen.getByRole('alert')).toHaveTextContent('내 팀을 불러오지 못했어요.');
		expect(screen.getByRole('alert')).toHaveTextContent('!');
		expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
	});

	it('성공한 빈 내 팀 목록을 안내한다', () => {
		myCologsQuery.current.data = [];

		renderWithQuery(<CologNavigation />);

		expect(screen.getByRole('status')).toHaveTextContent('아직 소속된 Colog가 없어요.');
		expect(screen.getByRole('status')).toHaveTextContent('–');
		expect(screen.getAllByRole('link')).toHaveLength(1);
		expect(screen.getByRole('link', { name: '팀 만들기' })).toBeInTheDocument();
	});
});
