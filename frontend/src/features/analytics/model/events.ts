import type { BlogType } from '@/domains/blog/model/blog';
import type { PostCategory } from '@/domains/post/model/post';
import { captureAnalyticsEvent } from '@/shared/analytics/posthog';

export type CologProfileChangedField = 'name' | 'logo' | 'cover_image' | 'introduction' | 'service_url' | 'github_url';

export const analytics = {
	githubLoginStarted: () => captureAnalyticsEvent('github login started'),
	githubLoginCompleted: ({ userType }: { userType: 'new' | 'returning' }) =>
		captureAnalyticsEvent('github login completed', { user_type: userType }),
	githubLoginFailed: () => captureAnalyticsEvent('github login failed'),
	signUpCompleted: ({ hasProfileImage, hasIntroduction }: { hasProfileImage: boolean; hasIntroduction: boolean }) =>
		captureAnalyticsEvent('sign up completed', {
			has_profile_image: hasProfileImage,
			has_introduction: hasIntroduction,
		}),
	postEditorOpened: () => captureAnalyticsEvent('post editor opened'),
	postPublished: ({
		category,
		hasCustomRepresentativeImage,
	}: {
		category: PostCategory;
		hasCustomRepresentativeImage: boolean;
	}) =>
		captureAnalyticsEvent('post published', {
			category,
			has_custom_representative_image: hasCustomRepresentativeImage,
		}),
	cologCreated: ({
		hasCoverImage,
		hasIntroduction,
		hasServiceUrl,
		hasGithubUrl,
	}: {
		hasCoverImage: boolean;
		hasIntroduction: boolean;
		hasServiceUrl: boolean;
		hasGithubUrl: boolean;
	}) =>
		captureAnalyticsEvent('colog created', {
			has_cover_image: hasCoverImage,
			has_introduction: hasIntroduction,
			has_service_url: hasServiceUrl,
			has_github_url: hasGithubUrl,
		}),
	cologMembersInvited: ({ invitedMemberCount }: { invitedMemberCount: number }) =>
		captureAnalyticsEvent('colog members invited', { invited_member_count: invitedMemberCount }),
	cologProfileUpdated: ({ changedFields }: { changedFields: CologProfileChangedField[] }) =>
		captureAnalyticsEvent('colog profile updated', { changed_fields: changedFields }),
	blogProfileViewed: ({ blogType }: { blogType: BlogType }) =>
		captureAnalyticsEvent('blog profile viewed', { blog_type: blogType }),
};
