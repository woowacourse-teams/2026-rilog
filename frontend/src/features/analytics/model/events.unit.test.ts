import { beforeEach, describe, expect, it, vi } from 'vitest';

import { analytics } from './events';

const { captureMock } = vi.hoisted(() => ({ captureMock: vi.fn() }));

vi.mock('@/shared/analytics/posthog', () => ({ captureAnalyticsEvent: captureMock }));

describe('analytics events', () => {
	beforeEach(() => {
		captureMock.mockReset();
	});

	it.each([
		['github login started', () => analytics.githubLoginStarted()],
		['github login failed', () => analytics.githubLoginFailed()],
		['post editor opened', () => analytics.postEditorOpened()],
	])('%s 이벤트를 속성 없이 전송한다', (eventName, capture) => {
		capture();

		expect(captureMock).toHaveBeenCalledWith(eventName);
	});

	it.each([
		['github login completed', () => analytics.githubLoginCompleted({ userType: 'new' }), { user_type: 'new' }],
		[
			'sign up completed',
			() => analytics.signUpCompleted({ hasProfileImage: true, hasIntroduction: false }),
			{ has_profile_image: true, has_introduction: false },
		],
		[
			'post published',
			() => analytics.postPublished({ category: 'IT', hasCustomRepresentativeImage: true }),
			{ category: 'IT', has_custom_representative_image: true },
		],
		[
			'colog created',
			() =>
				analytics.cologCreated({
					hasCoverImage: true,
					hasIntroduction: true,
					hasServiceUrl: false,
					hasGithubUrl: true,
				}),
			{ has_cover_image: true, has_introduction: true, has_service_url: false, has_github_url: true },
		],
		[
			'colog members invited',
			() => analytics.cologMembersInvited({ invitedMemberCount: 2 }),
			{ invited_member_count: 2 },
		],
		[
			'colog profile updated',
			() => analytics.cologProfileUpdated({ changedFields: ['name', 'cover_image'] }),
			{ changed_fields: ['name', 'cover_image'] },
		],
		['blog profile viewed', () => analytics.blogProfileViewed({ blogType: 'COLOG' }), { blog_type: 'COLOG' }],
	] as const)('%s 이벤트의 사용하기 쉬운 속성을 PostHog payload로 변환한다', (eventName, capture, properties) => {
		capture();

		expect(captureMock).toHaveBeenCalledWith(eventName, properties);
	});
});
