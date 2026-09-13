import { beforeEach, describe, expect, it, vi } from 'vitest';

import { analytics } from './events';

const { captureMock } = vi.hoisted(() => ({ captureMock: vi.fn() }));

vi.mock('@/shared/analytics/posthog', () => ({ captureAnalyticsEvent: captureMock }));

describe('analytics events', () => {
	beforeEach(() => {
		captureMock.mockReset();
	});

	it('About 페이지 진입 링크의 위치를 canonical payload로 전송한다', () => {
		analytics.aboutPageEntryClicked({ entrySource: 'release_note' });

		expect(captureMock).toHaveBeenCalledExactlyOnceWith('about page entry clicked', {
			entry_source: 'release_note',
		});
	});

	it('노션 명세의 인증 및 가입 이벤트를 canonical payload로 전송한다', () => {
		analytics.githubLoginStarted({ entrySurface: 'sidebar', redirectTarget: '/feeds' });
		analytics.githubLoginFailed({ failureStage: 'callback_request', errorCode: 'NETWORK' });
		analytics.signUpCompleted({
			hasProfileImage: true,
			hasIntroduction: false,
			hasServiceUrl: true,
			hasGithubUrl: false,
		});

		expect(captureMock).toHaveBeenNthCalledWith(1, 'github login started', {
			entry_surface: 'sidebar',
			redirect_target: '/feeds',
		});
		expect(captureMock).toHaveBeenNthCalledWith(2, 'github login failed', {
			failure_stage: 'callback_request',
			error_code: 'NETWORK',
		});
		expect(captureMock).toHaveBeenNthCalledWith(3, 'sign up completed', {
			has_profile_image: true,
			has_introduction: false,
			has_service_url: true,
			has_github_url: false,
		});
	});

	it('패치노트 모달 행동을 canonical payload로 전송한다', () => {
		analytics.releaseNoteViewed({ releaseNoteId: '2026-09-feed-update' });
		analytics.releaseNoteClosed({ releaseNoteId: '2026-09-feed-update', closeMethod: 'close_button' });
		analytics.releaseNoteBackdropClicked({ releaseNoteId: '2026-09-feed-update' });
		analytics.releaseNoteLinkClicked({ releaseNoteId: '2026-09-feed-update', linkTarget: 'about' });

		expect(captureMock).toHaveBeenNthCalledWith(1, 'release note viewed', {
			release_note_id: '2026-09-feed-update',
		});
		expect(captureMock).toHaveBeenNthCalledWith(2, 'release note closed', {
			release_note_id: '2026-09-feed-update',
			close_method: 'close_button',
		});
		expect(captureMock).toHaveBeenNthCalledWith(3, 'release note backdrop clicked', {
			release_note_id: '2026-09-feed-update',
		});
		expect(captureMock).toHaveBeenNthCalledWith(4, 'release note link clicked', {
			release_note_id: '2026-09-feed-update',
			link_target: 'about',
		});
	});

	it('사이드바 피드 필터를 canonical payload로 전송한다', () => {
		analytics.sidebarFeedFilterClicked({ feedScope: 'RILOG' });

		expect(captureMock).toHaveBeenCalledExactlyOnceWith('sidebar feed filter clicked', {
			feed_scope: 'RILOG',
		});
	});

	it('실제로 표시된 피드 범위와 카테고리를 canonical payload로 전송한다', () => {
		analytics.feedViewed({ feedScope: 'COLOG', category: 'TECH' });

		expect(captureMock).toHaveBeenCalledExactlyOnceWith('feed viewed', {
			feed_scope: 'COLOG',
			category: 'TECH',
		});
	});

	it('피드 카테고리 필터 클릭을 canonical payload로 전송한다', () => {
		analytics.feedCategoryFilterClicked({ category: 'RETROSPECT' });

		expect(captureMock).toHaveBeenCalledExactlyOnceWith('feed category filter clicked', {
			category: 'RETROSPECT',
		});
	});

	it('읽기, 발행, Co-log 초대 이벤트를 canonical 이름으로 전송한다', () => {
		analytics.postReadEngaged({ postId: 12, engagementSeconds: 8, scrollDepthBucket: '50_percent' });
		analytics.postPublished({
			postId: '12',
			ownerType: 'COLOG',
			cologId: 3,
			category: 'TECH',
			imageSource: 'body',
			blockCountBucket: '1-5',
		});
		analytics.cologMemberInvitationCompleted({ cologId: 3, invitedCount: 2, failedCount: 0 });

		expect(captureMock).toHaveBeenNthCalledWith(1, 'post read engaged', {
			post_id: 12,
			engagement_seconds: 8,
			scroll_depth_bucket: '50_percent',
		});
		expect(captureMock).toHaveBeenNthCalledWith(2, 'post published', expect.objectContaining({ colog_id: 3 }));
		expect(captureMock).toHaveBeenNthCalledWith(3, 'colog member invitation completed', {
			colog_id: 3,
			invited_count: 2,
			failed_count: 0,
		});
	});

	it('Co-log 멤버 초대 진입 위치를 canonical 속성으로 전송한다', () => {
		analytics.cologMemberInvitationEntryClicked({ entrySource: 'member_aside' });
		analytics.cologMemberInvitationEntryClicked({ entrySource: 'settings' });

		expect(captureMock).toHaveBeenNthCalledWith(1, 'colog member invitation entry clicked', {
			entry_source: 'member_aside',
		});
		expect(captureMock).toHaveBeenNthCalledWith(2, 'colog member invitation entry clicked', {
			entry_source: 'settings',
		});
	});

	it('개인 글 발행은 게시글 ID를 PostHog post_id로 전송한다', () => {
		analytics.postPublished({
			postId: '77',
			ownerType: 'RILOG',
			cologId: null,
			category: 'TECH',
			imageSource: 'default',
			blockCountBucket: '1-5',
		});

		expect(captureMock).toHaveBeenCalledWith('post published', {
			post_id: '77',
			owner_type: 'RILOG',
			colog_id: null,
			category: 'TECH',
			image_source: 'default',
			block_count_bucket: '1-5',
		});
	});

	it('기존 비-P0 이벤트는 유지한다', () => {
		analytics.cologProfileUpdated({ changedFields: ['name'] });
		expect(captureMock).toHaveBeenNthCalledWith(1, 'colog profile updated', { changed_fields: ['name'] });
	});

	it('프로필 진입 출처와 방문 ID를 전송한다', () => {
		analytics.blogProfileViewed({
			blogType: 'COLOG',
			blogId: 3,
			entrySource: 'feed',
			profileVisitId: 'visit-1',
		});

		expect(captureMock).toHaveBeenCalledExactlyOnceWith('blog profile viewed', {
			blog_type: 'COLOG',
			blog_id: 3,
			entry_source: 'feed',
			profile_visit_id: 'visit-1',
			entry_tracking_version: 1,
		});
	});
});
