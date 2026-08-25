import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import type { BlogPublicProfile } from '@/domains/blog/model/blog';

import BlogHome from './BlogHome';

const { memberAsideRenderMock } = vi.hoisted(() => ({ memberAsideRenderMock: vi.fn() }));

vi.mock('@/features/colog-members/ui/CologMemberAside', () => ({
	default: function MockCologMemberAside({ slug }: { slug: string }) {
		memberAsideRenderMock(slug);
		return <div>멤버 목록: {slug}</div>;
	},
}));

vi.mock('@/features/blog-profile/ui/BlogProfileHero', () => ({
	default: function MockBlogProfileHero({ profile, action }: { profile: BlogPublicProfile; action?: ReactNode }) {
		return (
			<div>
				프로필: {profile.type}
				{action}
			</div>
		);
	},
}));

vi.mock('@/features/colog-settings-access/ui/CologSettingsButton', () => ({
	default: function MockCologSettingsButton({ slug }: { slug: string }) {
		return <a href={`/@${slug}/settings?tab=profile`}>팀 설정</a>;
	},
}));

vi.mock('./BlogPostFeedSection', () => ({
	default: function MockBlogPostFeedSection({ slug }: { slug: string }) {
		return <div>게시글 목록: {slug}</div>;
	},
}));

const COLOG_PROFILE: BlogPublicProfile = {
	type: 'COLOG',
	id: 1,
	name: '리로그 팀',
	slug: 'rilog-team',
	profileImageUrl: null,
	coverImageUrl: null,
	memberCount: 5,
	postCount: 10,
};

describe('BlogHome', () => {
	beforeEach(() => {
		memberAsideRenderMock.mockClear();
	});

	it('COLOG에는 멤버 aside와 공통 프로필·게시글 영역을 조립한다', () => {
		render(<BlogHome profile={COLOG_PROFILE} />);

		expect(screen.getByText('프로필: COLOG')).toBeInTheDocument();
		expect(screen.getByText('게시글 목록: rilog-team')).toBeInTheDocument();
		expect(screen.getByText('멤버 목록: rilog-team')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: '팀 설정' })).toHaveAttribute(
			'href',
			'/@rilog-team/settings?tab=profile',
		);
		expect(memberAsideRenderMock).toHaveBeenCalledWith('rilog-team');
	});

	it('RILOG에는 멤버 aside를 생성하지 않고 공통 프로필·게시글 영역만 조립한다', () => {
		render(<BlogHome profile={{ ...COLOG_PROFILE, type: 'RILOG', name: '파라디', slug: 'jetproc', memberCount: 1 }} />);

		expect(screen.getByText('프로필: RILOG')).toBeInTheDocument();
		expect(screen.getByText('게시글 목록: jetproc')).toBeInTheDocument();
		expect(screen.queryByText(/멤버 목록:/)).not.toBeInTheDocument();
		expect(screen.queryByRole('link', { name: '팀 설정' })).not.toBeInTheDocument();
		expect(memberAsideRenderMock).not.toHaveBeenCalled();
	});
});
