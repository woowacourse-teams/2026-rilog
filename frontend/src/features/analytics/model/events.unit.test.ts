import { beforeEach, describe, expect, it, vi } from 'vitest';

import { analytics } from './events';

const { captureMock } = vi.hoisted(() => ({ captureMock: vi.fn() }));

vi.mock('@/shared/analytics/posthog', () => ({ captureAnalyticsEvent: captureMock }));

describe('analytics events', () => {
	beforeEach(() => {
		captureMock.mockReset();
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

	it('읽기, 발행, Co-log 초대 이벤트를 canonical 이름으로 전송한다', () => {
		analytics.postReadEngaged({ postId: 12, engagementSeconds: 8, scrollDepthBucket: '50_percent' });
		analytics.postPublished({
			postId: '12',
			ownerType: 'COLOG',
			cologId: 3,
			category: 'IT',
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

	it('개인 글 발행은 게시글 ID를 PostHog post_id로 전송한다', () => {
		analytics.postPublished({
			postId: '77',
			ownerType: 'RILOG',
			cologId: null,
			category: 'IT',
			imageSource: 'default',
			blockCountBucket: '1-5',
		});

		expect(captureMock).toHaveBeenCalledWith('post published', {
			post_id: '77',
			owner_type: 'RILOG',
			colog_id: null,
			category: 'IT',
			image_source: 'default',
			block_count_bucket: '1-5',
		});
	});

	it('기존 비-P0 이벤트는 유지한다', () => {
		analytics.cologProfileUpdated({ changedFields: ['name'] });
		analytics.blogProfileViewed({ blogType: 'COLOG' });

		expect(captureMock).toHaveBeenNthCalledWith(1, 'colog profile updated', { changed_fields: ['name'] });
		expect(captureMock).toHaveBeenNthCalledWith(2, 'blog profile viewed', { blog_type: 'COLOG' });
	});
});
