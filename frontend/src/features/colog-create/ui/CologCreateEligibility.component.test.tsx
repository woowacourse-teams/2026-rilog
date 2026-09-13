import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/render-with-query';

import CologCreateEligibility from './CologCreateEligibility';

const { myCologCountQuery } = vi.hoisted(() => {
	const queryState: {
		current: { data: number | undefined; isError: boolean };
	} = {
		current: { data: 0, isError: false },
	};

	return { myCologCountQuery: queryState };
});

vi.mock('@/shared/api/users/queries/my-cologs-overview/use-query', () => ({
	useMyCologsOverviewQuery: vi.fn(() => ({ ...myCologCountQuery.current })),
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ back: vi.fn(), replace: vi.fn() }),
}));

describe('CologCreateEligibility', () => {
	beforeEach(() => {
		myCologCountQuery.current = { data: 0, isError: false };
	});

	it('참여 중인 Colog가 10개이면 안내를 표시하고 생성 제출만 비활성화한다', () => {
		myCologCountQuery.current = { data: 10, isError: false };

		renderWithQuery(<CologCreateEligibility />);

		const notice = screen.getByRole('status');
		const submitButton = screen.getByRole('button', { name: '팀 만들기' });

		expect(notice).toHaveTextContent('참여 중인 Colog 수를 줄여 주세요.');
		expect(submitButton).toBeDisabled();
		expect(submitButton).toHaveAttribute('aria-describedby', notice.id);
		expect(screen.getByRole('textbox', { name: '팀 이름' })).toBeEnabled();
	});

	it('참여 중인 Colog가 10개 미만이면 안내 없이 생성할 수 있다', () => {
		myCologCountQuery.current = { data: 9, isError: false };

		renderWithQuery(<CologCreateEligibility />);

		expect(screen.queryByRole('status')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: '팀 만들기' })).toBeEnabled();
	});

	it('내 Colog 수를 확인하지 못하면 서버 검증을 위해 생성을 막지 않는다', () => {
		myCologCountQuery.current = { data: undefined, isError: true };

		renderWithQuery(<CologCreateEligibility />);

		expect(screen.queryByRole('status')).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: '팀 만들기' })).toBeEnabled();
	});
});
