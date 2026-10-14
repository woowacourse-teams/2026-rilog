import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createNotification } from '@/test/fixtures/notification';

import { analytics } from './events';

const { captureMock } = vi.hoisted(() => ({ captureMock: vi.fn() }));

vi.mock('@/shared/analytics/posthog', () => ({ captureAnalyticsEvent: captureMock }));

describe('analytics events', () => {
	beforeEach(() => {
		captureMock.mockReset();
	});

	it('알림 진입과 클릭은 본문 없이 실제 ID와 화면 상태를 전송한다', () => {
		const notification = createNotification({ state: 'comment-deleted', type: 'SELECTION_COMMENT' });
		analytics.notificationInboxEntered();
		analytics.notificationItemOpened({ notification });
		analytics.notificationReadButtonClicked({ notification });
		analytics.notificationAllReadClicked();

		const properties = {
			notification_id: notification.id,
			notification_type: 'SELECTION_COMMENT',
			notification_state: 'comment-deleted',
			post_id: notification.post.id,
			selection_id: notification.anchor.id,
			created_at: notification.createdAt,
			was_unread: true,
		};
		expect(captureMock).toHaveBeenNthCalledWith(1, 'notification inbox entered');
		expect(captureMock).toHaveBeenNthCalledWith(2, 'notification item opened', properties);
		expect(captureMock).toHaveBeenNthCalledWith(3, 'notification read button clicked', properties);
		expect(captureMock).toHaveBeenNthCalledWith(4, 'notification all read clicked');
		expect(JSON.stringify(captureMock.mock.calls)).not.toContain(notification.comment.content);
	});

	it('게시글 댓글 알림은 셀렉션 ID 없이 전송한다', () => {
		const notification = createNotification({ type: 'POST_COMMENT' });
		analytics.notificationItemOpened({ notification });

		expect(captureMock).toHaveBeenNthCalledWith(
			1,
			'notification item opened',
			expect.objectContaining({ selection_id: null }),
		);
	});

	it('읽기 진행 상태는 방문 ID, 누적 시간, 깊이 이력과 계측 버전을 전송한다', () => {
		analytics.postReadingProgress({
			postId: 12,
			readingVisitId: 'visit-1',
			engagementSeconds: 23.5,
			hasReached50Percent: true,
		});

		expect(captureMock).toHaveBeenCalledExactlyOnceWith('post reading progress', {
			post_id: 12,
			reading_visit_id: 'visit-1',
			engagement_seconds: 23.5,
			has_reached_50_percent: true,
			read_tracking_version: 2,
		});
	});

	it('pagehide 읽기 진행 상태에만 beacon 전송 옵션을 전달한다', () => {
		analytics.postReadingProgress(
			{ postId: 12, readingVisitId: 'visit-1', engagementSeconds: 3.5, hasReached50Percent: false },
			true,
		);
		expect(captureMock).toHaveBeenCalledExactlyOnceWith(
			'post reading progress',
			{
				post_id: 12,
				reading_visit_id: 'visit-1',
				engagement_seconds: 3.5,
				has_reached_50_percent: false,
				read_tracking_version: 2,
			},
			{ transport: 'sendBeacon' },
		);
	});

	it('About 페이지 조회와 링크 행동을 canonical payload로 전송한다', () => {
		analytics.aboutPageViewed({ acquisitionSource: 'pre_registration_email' });
		analytics.aboutPageEntryClicked({ entrySource: 'release_note' });
		analytics.aboutPageLinkClicked({ linkTarget: 'feeds' });

		expect(captureMock).toHaveBeenNthCalledWith(1, 'about page viewed', {
			acquisition_source: 'pre_registration_email',
		});
		expect(captureMock).toHaveBeenNthCalledWith(2, 'about page entry clicked', {
			entry_source: 'release_note',
		});
		expect(captureMock).toHaveBeenNthCalledWith(3, 'about page link clicked', {
			link_target: 'feeds',
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

describe('더 리로그 이벤트 계약', () => {
	beforeEach(() => captureMock.mockReset());

	const theRilog = {
		theRilogVisitId: 'visit',
		theRilogClickId: 'click',
		contentType: 'headline' as const,
		position: 2,
		headlineId: '12:block',
	};
	const properties = {
		the_rilog_visit_id: 'visit',
		the_rilog_click_id: 'click',
		content_type: 'headline',
		position: 2,
		headline_id: '12:block',
	};

	it.each(['headline', 'enterprise', 'personal'] as const)(
		'각 콘텐츠 클릭을 구분하고 기사 위치를 기록한다: %s',
		(contentType) => {
			analytics.theRilogContentClicked({
				...theRilog,
				headlineId: contentType === 'headline' ? theRilog.headlineId : undefined,
				contentType,
				postId: 12,
				navigationType: 'same_tab',
			});
			expect(captureMock).toHaveBeenCalledExactlyOnceWith(`the rilog ${contentType} clicked`, {
				...properties,
				content_type: contentType,
				...(contentType === 'headline' ? {} : { headline_id: undefined }),
				post_id: 12,
				navigation_type: 'same_tab',
			});
		},
	);

	it('상세 도착과 읽기 진행에 동일한 클릭 정보를 연결한다', () => {
		analytics.postDetailViewed({
			postId: 12,
			ownerType: 'RILOG',
			category: 'TECH',
			entrySource: 'the_rilog',
			feedPosition: null,
			theRilog,
		});
		analytics.postReadingProgress({
			postId: 12,
			readingVisitId: 'reading',
			engagementSeconds: 7,
			hasReached50Percent: false,
			theRilog,
		});
		expect(captureMock).toHaveBeenNthCalledWith(
			1,
			'post detail viewed',
			expect.objectContaining({ ...properties, entry_source: 'the_rilog' }),
		);
		expect(captureMock).toHaveBeenNthCalledWith(
			2,
			'post reading progress',
			expect.objectContaining({
				...properties,
				reading_visit_id: 'reading',
				entry_source: 'the_rilog',
				engagement_seconds: 7,
			}),
		);
	});

	it('방문과 활성 체류 시간을 기록하고 이탈 시 beacon을 사용한다', () => {
		analytics.theRilogViewed({ theRilogVisitId: 'visit' });
		analytics.theRilogEngagementUpdated({ theRilogVisitId: 'visit', engagementSeconds: 15 });
		analytics.theRilogEngagementUpdated({ theRilogVisitId: 'visit', engagementSeconds: 16 }, true);
		expect(captureMock).toHaveBeenNthCalledWith(1, 'the rilog viewed', { the_rilog_visit_id: 'visit' });
		expect(captureMock).toHaveBeenNthCalledWith(2, 'the rilog engagement updated', {
			the_rilog_visit_id: 'visit',
			engagement_seconds: 15,
		});
		expect(captureMock).toHaveBeenNthCalledWith(
			3,
			'the rilog engagement updated',
			{ the_rilog_visit_id: 'visit', engagement_seconds: 16 },
			{ transport: 'sendBeacon' },
		);
	});
});
