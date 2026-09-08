import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import PostDetailAuthorProfile from './PostDetailAuthorProfile';

describe('PostDetailAuthorProfile', () => {
	it('본문 끝에서 저자 프로필과 개인 블로그 링크를 제공한다', () => {
		render(
			<PostDetailAuthorProfile
				author={{
					id: 7,
					nickname: '리로거',
					slug: 'riloger',
					profileImageUrl: null,
					description: '기록하며 성장하는 개발자입니다.',
				}}
			/>,
		);

		expect(screen.getByRole('heading', { name: '리로거' })).toBeInTheDocument();
		expect(screen.getByText('기록하며 성장하는 개발자입니다.')).toBeInTheDocument();
		expect(screen.queryByText('@riloger')).not.toBeInTheDocument();
		expect(screen.getByRole('link', { name: /리로거/ })).toHaveAttribute('href', '/@riloger');
	});
});
