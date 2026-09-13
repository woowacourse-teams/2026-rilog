import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PostDetailBlogProfile from './PostDetailBlogProfile';

describe('PostDetailBlogProfile', () => {
	it('Rilog 프로필에는 사용자 avatar와 개인 블로그 링크를 제공한다', () => {
		render(
			<PostDetailBlogProfile
				profile={{
					id: 7,
					type: 'RILOG',
					name: '리로거',
					slug: 'riloger',
					profileImageUrl: null,
					description: '기록하며 성장하는 개발자입니다.',
				}}
			/>,
		);

		expect(screen.getByRole('img', { name: '리로거 개인 블로그 프로필' })).toHaveClass('rounded-full');
		expect(screen.getByRole('heading', { name: '리로거' })).toBeInTheDocument();
		expect(screen.getByText('기록하며 성장하는 개발자입니다.')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /리로거/ })).toHaveAttribute('href', '/@riloger');
	});

	it('Colog 프로필에는 팀 로고와 Colog 링크를 제공한다', () => {
		render(
			<PostDetailBlogProfile
				profile={{
					id: 9,
					type: 'COLOG',
					name: '리로그 팀',
					slug: 'rilog-team',
					profileImageUrl: null,
					description: '함께 기록하는 팀입니다.',
				}}
			/>,
		);

		expect(screen.getByRole('img', { name: '리로그 팀 팀 로고' })).toHaveClass('rounded-xl');
		expect(screen.getByRole('heading', { name: '리로그 팀' })).toBeInTheDocument();
		expect(screen.getByText('함께 기록하는 팀입니다.')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /리로그 팀/ })).toHaveAttribute('href', '/@rilog-team');
	});
});
