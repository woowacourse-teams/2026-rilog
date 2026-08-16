import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { PostSummary } from '@/domains/post/model/post-summary';

import CologPostList from './CologPostList';

const POST_FIXTURES: PostSummary[] = [
	{
		id: 101,
		title: '접근 가능한 인터페이스 만들기',
		publishedAt: '2026-08-16',
		author: { nickname: '새봄', profileImageUrl: '/images/saebom.png' },
	},
	{
		id: 102,
		title: '디자인 토큰 운영 기록',
		publishedAt: '2026-08-15',
		author: { nickname: '여름', profileImageUrl: null },
	},
];

describe('CologPostList', () => {
	it('전달받은 게시글만 렌더링한다', () => {
		render(<CologPostList posts={POST_FIXTURES} />);

		const postSection = screen.getByRole('region', { name: '코로그 게시글' });
		expect(within(postSection).getAllByRole('link')).toHaveLength(2);
		expect(within(postSection).getByRole('link', { name: /접근 가능한 인터페이스 만들기/ })).toHaveAttribute(
			'href',
			'/posts/101',
		);
		expect(within(postSection).getByText('2026년 8월 16일')).toBeInTheDocument();
	});

	it('게시글이 없으면 빈 상태를 제공한다', () => {
		render(<CologPostList posts={[]} />);

		expect(screen.getByText('아직 작성된 게시글이 없습니다.')).toBeInTheDocument();
	});
});
