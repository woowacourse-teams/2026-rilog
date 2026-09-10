import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import { renderWithQuery } from '@/test/render-with-query';

import AuthenticatedSidebarFooter from './AuthenticatedSidebarFooter';

const { MY_INFO_RESPONSE, mutateMock, myInfoQuery } = vi.hoisted(() => {
	const myInfoResponse = {
		status: 200,
		message: 'OK',
		data: {
			id: 1,
			slug: 'jetproc',
			nickname: '파라디',
			profileImageUrl: null,
		},
	};
	const current: {
		response: typeof myInfoResponse | undefined;
		isPending: boolean;
		isError: boolean;
		isFetching: boolean;
	} = {
		response: myInfoResponse,
		isPending: false,
		isError: false,
		isFetching: false,
	};

	return {
		MY_INFO_RESPONSE: myInfoResponse,
		mutateMock: vi.fn(),
		myInfoQuery: { current },
	};
});

vi.mock('@/shared/api/auth/mutations/use-logout-mutation', () => ({
	useLogoutMutation: () => ({ mutate: mutateMock }),
}));

vi.mock('@/shared/api/users/queries/my-info/use-query', () => ({
	useMyInfoQuery: vi.fn(({ select }: { select?: (response: typeof MY_INFO_RESPONSE) => unknown }) => {
		return {
			...myInfoQuery.current,
			data:
				myInfoQuery.current.response === undefined
					? undefined
					: (select?.(myInfoQuery.current.response) ?? myInfoQuery.current.response),
		};
	}),
}));

function renderFooter() {
	return renderWithQuery(
		<AUTH_CONTEXT.Provider value={{ isAuthenticated: true, isInitialized: true }}>
			<AuthenticatedSidebarFooter />
		</AUTH_CONTEXT.Provider>,
	);
}

describe('AuthenticatedSidebarFooter', () => {
	beforeEach(() => {
		myInfoQuery.current = {
			response: MY_INFO_RESPONSE,
			isPending: false,
			isError: false,
			isFetching: false,
		};
		mutateMock.mockReset();
	});

	it('글쓰기와 프로필 진입점, 로그아웃 버튼을 제공한다', () => {
		renderFooter();

		const [writeLink, profileLink] = screen.getAllByRole('link');
		const logoutButton = screen.getByRole('button');

		expect(writeLink).toHaveAttribute('href', '/write');
		expect(profileLink).toHaveAttribute('href', '/@jetproc');
		expect(profileLink).toHaveAccessibleName();
		expect(logoutButton).toBeEnabled();
	});

	it('키보드로 푸터 링크와 로그아웃 버튼을 순차적으로 이동한다', async () => {
		const user = userEvent.setup();
		renderFooter();
		const [writeLink, profileLink] = screen.getAllByRole('link');
		const logoutButton = screen.getByRole('button');

		await user.tab();
		expect(writeLink).toHaveFocus();

		await user.tab();
		expect(profileLink).toHaveFocus();

		await user.tab();
		expect(logoutButton).toHaveFocus();
	});

	it('로그아웃 버튼을 누르면 별도 페이지 이동 없이 로그아웃을 요청한다', async () => {
		const user = userEvent.setup();
		renderFooter();

		await user.click(screen.getByRole('button', { name: '로그아웃' }));

		expect(mutateMock).toHaveBeenCalledOnce();
		expect(mutateMock).toHaveBeenCalledWith();
	});

	it('내 정보를 불러오는 동안 깨진 프로필 링크를 노출하지 않는다', () => {
		myInfoQuery.current = {
			response: undefined,
			isPending: true,
			isError: false,
			isFetching: true,
		};

		renderFooter();

		expect(screen.getByRole('status')).toHaveTextContent('내 정보를 불러오는 중...');
		expect(screen.getByRole('status')).toHaveTextContent('…');
		expect(screen.getAllByRole('link')).toHaveLength(1);
		expect(screen.getByRole('link', { name: '글쓰기' })).toHaveAttribute('href', '/write');
		expect(screen.queryByRole('link', { name: /@/ })).not.toBeInTheDocument();
		expect(screen.queryByRole('link', { name: '' })).not.toBeInTheDocument();
	});

	it('내 정보 조회가 실패하면 깨진 링크 대신 느낌표 아바타와 안내를 표시한다', () => {
		myInfoQuery.current = {
			response: undefined,
			isPending: false,
			isError: true,
			isFetching: false,
		};
		renderFooter();

		expect(screen.getByRole('alert', { name: '내 정보를 불러오지 못했어요.' })).toHaveTextContent('내 정보 오류');
		expect(screen.getByText('내 정보 오류')).toHaveAttribute('title', '내 정보를 불러오지 못했어요.');
		expect(screen.getByRole('alert')).toHaveTextContent('!');
		expect(screen.getAllByRole('link')).toHaveLength(1);
		expect(screen.queryByRole('link', { name: /@/ })).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '다시 시도' })).not.toBeInTheDocument();
	});

	it('내 정보 실패 상태에서 글쓰기와 로그아웃으로 키보드 이동한다', async () => {
		myInfoQuery.current = {
			response: undefined,
			isPending: false,
			isError: true,
			isFetching: false,
		};
		const user = userEvent.setup();

		renderFooter();

		for (const control of [
			screen.getByRole('link', { name: '글쓰기' }),
			screen.getByRole('button', { name: '로그아웃' }),
		]) {
			await user.tab();
			expect(control).toHaveFocus();
		}
	});
});
