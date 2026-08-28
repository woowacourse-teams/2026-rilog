import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import ButtonLink from './ButtonLink';

describe('ButtonLink', () => {
	it('페이지 이동 action을 link 의미로 제공한다', () => {
		render(<ButtonLink href="/write">글쓰기</ButtonLink>);

		expect(screen.getByRole('link', { name: '글쓰기' })).toHaveAttribute('href', '/write');
		expect(screen.queryByRole('button', { name: '글쓰기' })).not.toBeInTheDocument();
	});

	it('키보드 focus와 native anchor 속성을 전달한다', async () => {
		const user = userEvent.setup();
		const linkRef = createRef<HTMLAnchorElement>();

		render(
			<ButtonLink ref={linkRef} href="/login" aria-label="로그인 페이지로 이동">
				로그인
			</ButtonLink>,
		);

		const link = screen.getByRole('link', { name: '로그인 페이지로 이동' });
		await user.tab();

		expect(link).toHaveFocus();
		expect(linkRef.current).toBe(link);
	});
});
