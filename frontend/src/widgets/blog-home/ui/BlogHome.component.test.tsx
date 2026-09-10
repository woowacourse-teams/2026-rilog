import { render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import type { BlogPublicProfile } from '@/domains/blog/model/blog';

import BlogHome from './BlogHome';

const { feedRenderMock, feedState, headingRenderMock, memberAsideRenderMock, profileViewTrackerRenderMock } =
	vi.hoisted(() => {
		const mutableFeedState: { current: 'ready' | 'loading' | 'empty' | 'error' } = { current: 'ready' };

		return {
			feedRenderMock: vi.fn(),
			feedState: mutableFeedState,
			headingRenderMock: vi.fn(),
			memberAsideRenderMock: vi.fn(),
			profileViewTrackerRenderMock: vi.fn(),
		};
	});

vi.mock('@/features/analytics/ui/BlogProfileViewTracker', () => ({
	default: function MockBlogProfileViewTracker({ blogType }: { blogType: BlogPublicProfile['type'] }) {
		profileViewTrackerRenderMock(blogType);
		return null;
	},
}));

vi.mock('@/features/blog-home-index/ui/BlogHomeIndexRecovery', () => ({ default: () => null }));

vi.mock('@/features/blog-post-feed/ui/BlogPostFeed', () => ({
	default: function MockBlogPostFeed({
		slug,
		blogType,
		filter,
		initialRequestFailed,
		heading,
	}: {
		slug: string;
		blogType: BlogPublicProfile['type'];
		filter: { type: string };
		initialRequestFailed?: boolean;
		heading?: ReactNode;
	}) {
		feedRenderMock({ slug, blogType, filter, initialRequestFailed });
		if (feedState.current === 'loading') return <div role="status">게시글 로딩 중</div>;
		if (feedState.current === 'empty') return <div>빈 게시글 목록</div>;
		if (feedState.current === 'error') return <div role="alert">게시글 오류</div>;
		return (
			<>
				{heading}
				<div data-testid="feed-slot">게시글 목록: {slug}</div>
			</>
		);
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

vi.mock('./BlogHomeNavigation', () => ({
	default: function MockBlogHomeNavigation({ blogType }: { blogType: BlogPublicProfile['type'] }) {
		return <div>{blogType === 'COLOG' ? '챕터 탐색' : '시리즈와 Colog 탐색'}</div>;
	},
}));

vi.mock('./BlogHomeFeedHeading', () => ({
	default: function MockBlogHomeFeedHeading({
		blogType,
		filter,
		initialIndexRequestFailed,
	}: {
		blogType: BlogPublicProfile['type'];
		filter: { type: string };
		initialIndexRequestFailed?: boolean;
	}) {
		headingRenderMock({ blogType, filter, initialIndexRequestFailed });
		return <h2>{filter.type === 'all' ? '전체' : '챕터 제목'}</h2>;
	},
}));

vi.mock('./BlogHomeToolbar', () => ({ default: () => <div>모바일 인덱스</div> }));

vi.mock('./BlogHomeCologAside', () => ({
	default: function MockBlogHomeCologAside() {
		return (
			<div role="region" aria-label="Colog">
				참여 Colog
			</div>
		);
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
		feedState.current = 'ready';
		headingRenderMock.mockClear();
		memberAsideRenderMock.mockClear();
		profileViewTrackerRenderMock.mockClear();
	});

	it('COLOG에는 멤버 aside와 챕터 탐색을 유지하고 RILOG 전용 aside를 노출하지 않는다', () => {
		render(<BlogHome profile={COLOG_PROFILE} filter={{ type: 'all' }} />);

		expect(screen.getByText('프로필: COLOG')).toBeInTheDocument();
		expect(screen.getByText('게시글 목록: rilog-team')).toBeInTheDocument();
		expect(screen.getAllByText('멤버 목록: rilog-team')).toHaveLength(2);
		expect(screen.getByRole('link', { name: '팀 설정' })).toHaveAttribute('href', '/@rilog-team/settings?tab=profile');
		expect(screen.getByText('챕터 탐색')).toBeInTheDocument();
		expect(screen.queryByRole('region', { name: 'Colog' })).not.toBeInTheDocument();
		expect(memberAsideRenderMock).toHaveBeenCalledTimes(2);
		expect(memberAsideRenderMock).toHaveBeenCalledWith('rilog-team');
		expect(profileViewTrackerRenderMock).toHaveBeenCalledWith('COLOG');
		expect(feedRenderMock).toHaveBeenCalledWith({
			slug: 'rilog-team',
			blogType: 'COLOG',
			filter: { type: 'all' },
			initialRequestFailed: false,
		});
		expect(screen.getByRole('heading', { level: 2, name: '전체' })).toBeInTheDocument();
	});

	it('COLOG의 본문 Members를 toolbar 앞에 추가하고 기존 우측 aside를 유지한다', () => {
		render(<BlogHome profile={COLOG_PROFILE} filter={{ type: 'all' }} />);

		const main = screen.getByRole('main');
		const compactMembers = within(main).getByText('멤버 목록: rilog-team');
		const toolbar = within(main).getByText('모바일 인덱스');
		const wideMembers = screen
			.getAllByText('멤버 목록: rilog-team')
			.find((members) => members.closest('aside') !== null);

		expect(compactMembers.compareDocumentPosition(toolbar) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(wideMembers).toBeInTheDocument();
	});

	it('RILOG에는 개인 settings와 시리즈·코로그 탐색, API 코로그 aside를 조립한다', () => {
		render(
			<BlogHome
				profile={{ ...COLOG_PROFILE, type: 'RILOG', name: '파라디', slug: 'jetproc', memberCount: 1 }}
				filter={{ type: 'all' }}
			/>,
		);

		expect(screen.getByText('프로필: RILOG')).toBeInTheDocument();
		expect(screen.getByRole('link', { name: '개인 설정' })).toHaveAttribute('href', '/@jetproc/settings?tab=profile');
		expect(screen.queryByText(/멤버 목록:/)).not.toBeInTheDocument();
		expect(screen.getByTestId('feed-slot')).toHaveTextContent('게시글 목록: jetproc');
		expect(screen.getByText('시리즈와 Colog 탐색')).toBeInTheDocument();
		expect(screen.getByRole('region', { name: 'Colog' })).toBeInTheDocument();
		expect(memberAsideRenderMock).not.toHaveBeenCalled();
		expect(profileViewTrackerRenderMock).toHaveBeenCalledWith('RILOG');
		expect(feedRenderMock).toHaveBeenCalledWith({
			slug: 'jetproc',
			blogType: 'RILOG',
			filter: { type: 'all' },
			initialRequestFailed: false,
		});
		expect(screen.getByRole('heading', { level: 2, name: '전체' })).toBeInTheDocument();
		expect(headingRenderMock).toHaveBeenCalledWith({
			blogType: 'RILOG',
			filter: { type: 'all' },
			initialIndexRequestFailed: false,
		});
		expect(screen.getByTestId('feed-slot').parentElement).toHaveClass('px-6', 'py-11');
		expect(screen.getByTestId('feed-slot').parentElement).not.toHaveClass('aside-right:px-0');
	});

	it('COLOG 피드에 제목을 전달해 toolbar와 게시글 목록 사이에 표시한다', () => {
		render(
			<BlogHome
				profile={COLOG_PROFILE}
				filter={{ type: 'chapterId', chapterId: 3 }}
				initialIndexRequestFailed
				initialPostsRequestFailed
			/>,
		);

		const toolbar = screen.getByText('모바일 인덱스');
		const heading = screen.getByRole('heading', { level: 2, name: '챕터 제목' });
		const feed = screen.getByTestId('feed-slot');

		expect(toolbar.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(heading.compareDocumentPosition(feed) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(headingRenderMock).toHaveBeenCalledWith({
			blogType: 'COLOG',
			filter: { type: 'chapterId', chapterId: 3 },
			initialIndexRequestFailed: true,
		});
		expect(feedRenderMock).toHaveBeenCalledWith({
			slug: 'rilog-team',
			blogType: 'COLOG',
			filter: { type: 'chapterId', chapterId: 3 },
			initialRequestFailed: true,
		});
	});
});
