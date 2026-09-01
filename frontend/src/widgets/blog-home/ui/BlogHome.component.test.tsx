import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import type { BlogPublicProfile } from '@/domains/blog/model/blog';

import BlogHome from './BlogHome';

const { memberAsideRenderMock, profileViewTrackerRenderMock } = vi.hoisted(() => ({
	memberAsideRenderMock: vi.fn(),
	profileViewTrackerRenderMock: vi.fn(),
}));

vi.mock('@/features/analytics/ui/BlogProfileViewTracker', () => ({
	default: function MockBlogProfileViewTracker({ blogType }: { blogType: BlogPublicProfile['type'] }) {
		profileViewTrackerRenderMock(blogType);
		return null;
	},
}));

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

vi.mock('@/features/rilog-settings-access/ui/RilogSettingsButton', () => ({
	default: function MockRilogSettingsButton({ slug }: { slug: string }) {
		return <a href={`/@${slug}/settings?tab=profile`}>개인 설정</a>;
	},
}));

vi.mock('./BlogPostFeedSection', () => ({
	default: function MockBlogPostFeedSection({ slug }: { slug: string }) {
		return <div data-testid="feed-slot">게시글 목록: {slug}</div>;
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
		profileViewTrackerRenderMock.mockClear();
	});

	it('COLOG에는 멤버 aside와 챕터 탐색을 유지하고 RILOG 전용 섹션을 노출하지 않는다', () => {
		render(<BlogHome profile={COLOG_PROFILE} />);

		expect(screen.getByText('프로필: COLOG')).toBeInTheDocument();
		expect(screen.getByText('게시글 목록: rilog-team')).toBeInTheDocument();
		expect(screen.getByText('멤버 목록: rilog-team')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: '팀 설정' })).toHaveAttribute('href', '/@rilog-team/settings?tab=profile');
		expect(screen.getByRole('heading', { name: '챕터' })).toBeInTheDocument();
		expect(screen.queryByRole('region', { name: 'Cologs' })).not.toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: '시리즈' })).not.toBeInTheDocument();
		expect(screen.queryByRole('heading', { name: '코로그' })).not.toBeInTheDocument();
		expect(memberAsideRenderMock).toHaveBeenCalledWith('rilog-team');
		expect(profileViewTrackerRenderMock).toHaveBeenCalledWith('COLOG');
	});

	it('RILOG에는 settings와 시리즈·코로그 탐색, 참여 코로그 aside를 조립한다', () => {
		render(<BlogHome profile={{ ...COLOG_PROFILE, type: 'RILOG', name: '파라디', slug: 'jetproc', memberCount: 1 }} />);

		expect(screen.getByText('프로필: RILOG')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: '개인 설정' })).toHaveAttribute('href', '/@jetproc/settings?tab=profile');
		expect(screen.queryByText(/멤버 목록:/)).not.toBeInTheDocument();
		expect(screen.getByTestId('feed-slot')).toHaveTextContent('게시글 목록: jetproc');
		expect(screen.getByRole('heading', { name: '시리즈' })).toBeInTheDocument();
		expect(screen.getByRole('heading', { name: '코로그' })).toBeInTheDocument();
		expect(screen.getByRole('region', { name: 'Cologs' })).toBeInTheDocument();
		expect(screen.getByRole('img', { name: 'Rilog 로고' })).toBeInTheDocument();
		expect(screen.getByTestId('feed-slot')).toHaveTextContent('게시글 목록: jetproc');
		expect(memberAsideRenderMock).not.toHaveBeenCalled();
		expect(profileViewTrackerRenderMock).toHaveBeenCalledWith('RILOG');
	});
});
