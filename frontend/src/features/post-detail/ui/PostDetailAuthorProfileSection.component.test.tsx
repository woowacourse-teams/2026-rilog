import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getBlogPublicProfile } from '@/features/blog-profile/lib/get-blog-public-profile';

import PostDetailAuthorProfileSection from './PostDetailAuthorProfileSection';

vi.mock('@/features/blog-profile/lib/get-blog-public-profile');

describe('PostDetailAuthorProfileSection', () => {
	beforeEach(() => {
		vi.mocked(getBlogPublicProfile).mockReset();
	});

	it('작성자 slug로 조회한 개인 블로그 소개를 표시한다', async () => {
		vi.mocked(getBlogPublicProfile).mockResolvedValue({
			profile: {
				type: 'RILOG',
				id: 7,
				name: '리로거',
				slug: 'riloger',
				description: 'API에서 조회한 작성자 소개입니다.',
				profileImageUrl: null,
				coverImageUrl: null,
				memberCount: 1,
				postCount: 3,
			},
			response: {
				status: 200,
				message: '블로그 공개 프로필 조회에 성공했습니다.',
			},
		});

		render(await PostDetailAuthorProfileSection({ authorSlug: 'riloger' }));

		expect(getBlogPublicProfile).toHaveBeenCalledWith('riloger');
		expect(screen.getByRole('heading', { name: '리로거' })).toBeInTheDocument();
		expect(screen.getByText('API에서 조회한 작성자 소개입니다.')).toBeInTheDocument();
	});

	it('작성자 프로필을 찾지 못하면 아무것도 표시하지 않는다', async () => {
		vi.mocked(getBlogPublicProfile).mockResolvedValue(null);

		const profileSection = await PostDetailAuthorProfileSection({ authorSlug: 'unknown' });

		expect(profileSection).toBeNull();
	});
});
