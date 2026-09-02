import type {
	AnalyticsErrorProperties,
	BlockCountBucket,
	CologCreationEntrySource,
	CologMemberInvitationEntrySource,
	ContentLoadPhase,
	ContentLoadSurface,
	EditingTimeBucket,
	EditorEntrySource,
	ImageSource,
	LoginEntrySurface,
	PostDocumentState,
	PostEntrySource,
	PublishFailureStage,
	ScrollDepthBucket,
} from './analytics-event';

import type { BlogType } from '@/domains/blog/model/blog';
import type { PostCategory } from '@/domains/post/model/post';
import { captureAnalyticsEvent } from '@/shared/analytics/posthog';

export type CologProfileChangedField = 'name' | 'logo' | 'cover_image' | 'introduction' | 'service_url' | 'github_url';

export type { EditorEntrySource, PostEntrySource } from './analytics-event';

export const analytics = {
	githubLoginStarted: ({ entrySurface, redirectTarget }: { entrySurface: LoginEntrySurface; redirectTarget: string }) =>
		captureAnalyticsEvent('github login started', { entry_surface: entrySurface, redirect_target: redirectTarget }),
	githubLoginCompleted: ({ userType }: { userType: 'new' | 'returning' }) =>
		captureAnalyticsEvent('github login completed', { user_type: userType }),
	githubLoginFailed: ({ failureStage, errorCode }: { failureStage: string; errorCode: string }) =>
		captureAnalyticsEvent('github login failed', { failure_stage: failureStage, error_code: errorCode }),
	signUpStarted: () => captureAnalyticsEvent('sign up started', { entry_source: 'github_oauth' }),
	signUpCompleted: ({
		hasProfileImage,
		hasIntroduction,
		hasServiceUrl,
		hasGithubUrl,
	}: {
		hasProfileImage: boolean;
		hasIntroduction: boolean;
		hasServiceUrl: boolean;
		hasGithubUrl: boolean;
	}) =>
		captureAnalyticsEvent('sign up completed', {
			has_profile_image: hasProfileImage,
			has_introduction: hasIntroduction,
			has_service_url: hasServiceUrl,
			has_github_url: hasGithubUrl,
		}),
	signUpFailed: ({ failureStage, errorCode }: { failureStage: string; errorCode: string }) =>
		captureAnalyticsEvent('sign up failed', { failure_stage: failureStage, error_code: errorCode }),
	postDetailViewed: ({
		postId,
		ownerType,
		category,
		entrySource,
		feedPosition,
	}: {
		postId: number;
		ownerType: BlogType;
		category: PostCategory;
		entrySource: PostEntrySource;
		feedPosition: number | null;
	}) =>
		captureAnalyticsEvent('post detail viewed', {
			post_id: postId,
			owner_type: ownerType,
			category,
			entry_source: entrySource,
			feed_position: feedPosition,
		}),
	postReadEngaged: ({
		postId,
		engagementSeconds,
		scrollDepthBucket,
	}: {
		postId: number;
		engagementSeconds: number;
		scrollDepthBucket: ScrollDepthBucket;
	}) =>
		captureAnalyticsEvent('post read engaged', {
			post_id: postId,
			engagement_seconds: engagementSeconds,
			scroll_depth_bucket: scrollDepthBucket,
		}),
	postEditorOpened: ({
		entrySource,
		availableBlogCount,
	}: {
		entrySource: EditorEntrySource;
		availableBlogCount: number | null;
	}) =>
		captureAnalyticsEvent('post editor opened', {
			entry_source: entrySource,
			available_blog_count: availableBlogCount,
		}),
	postEditorUnavailableViewed: () =>
		captureAnalyticsEvent('post editor unavailable viewed', { reason: 'mobile_device' }),
	postPublishSettingsOpened: () => captureAnalyticsEvent('post publish settings opened', { validation_state: 'valid' }),
	postPublishValidationFailed: ({ invalidFields }: { invalidFields: string[] }) =>
		captureAnalyticsEvent('post publish validation failed', { invalid_fields: invalidFields }),
	postPublishStarted: ({
		ownerType,
		category,
		imageSource,
	}: {
		ownerType: BlogType;
		category: PostCategory;
		imageSource: ImageSource;
	}) => captureAnalyticsEvent('post publish started', { owner_type: ownerType, category, image_source: imageSource }),
	postPublished: ({
		postId,
		ownerType,
		category,
		cologId,
		imageSource,
		blockCountBucket,
	}: {
		postId: string;
		ownerType: BlogType;
		category: PostCategory;
		cologId: number | null;
		imageSource: ImageSource;
		blockCountBucket: BlockCountBucket;
	}) =>
		captureAnalyticsEvent('post published', {
			post_id: postId,
			owner_type: ownerType,
			colog_id: cologId,
			category,
			image_source: imageSource,
			block_count_bucket: blockCountBucket,
		}),
	postPublishFailed: ({
		failureStage,
		errorCode,
		errorKind,
	}: { failureStage: PublishFailureStage } & AnalyticsErrorProperties) =>
		captureAnalyticsEvent('post publish failed', {
			failure_stage: failureStage,
			error_code: errorCode,
			error_kind: errorKind,
		}),
	postDraftAbandoned: ({
		documentState,
		editingTimeBucket,
	}: {
		documentState: PostDocumentState;
		editingTimeBucket: EditingTimeBucket;
	}) =>
		captureAnalyticsEvent('post draft abandoned', {
			document_state: documentState,
			editing_time_bucket: editingTimeBucket,
		}),
	cologCreationStarted: ({ entrySource }: { entrySource: CologCreationEntrySource }) =>
		captureAnalyticsEvent('colog creation started', { entry_source: entrySource }),
	cologCreated: ({
		cologId,
		hasCoverImage,
		hasIntroduction,
		hasServiceUrl,
		hasGithubUrl,
	}: {
		cologId: number;
		hasCoverImage: boolean;
		hasIntroduction: boolean;
		hasServiceUrl: boolean;
		hasGithubUrl: boolean;
	}) =>
		captureAnalyticsEvent('colog created', {
			colog_id: cologId,
			has_cover_image: hasCoverImage,
			has_introduction: hasIntroduction,
			has_service_url: hasServiceUrl,
			has_github_url: hasGithubUrl,
		}),
	cologCreationFailed: ({ errorCode, invalidFields }: { errorCode: string; invalidFields: string[] }) =>
		captureAnalyticsEvent('colog creation failed', { error_code: errorCode, invalid_fields: invalidFields }),
	cologMemberInvitationEntryClicked: ({ entrySource }: { entrySource: CologMemberInvitationEntrySource }) =>
		captureAnalyticsEvent('colog member invitation entry clicked', { entry_source: entrySource }),
	cologMemberInvitationStarted: ({ cologId, candidateCount }: { cologId: number; candidateCount: number }) =>
		captureAnalyticsEvent('colog member invitation started', { colog_id: cologId, candidate_count: candidateCount }),
	cologMemberInvitationCompleted: ({
		cologId,
		invitedCount,
		failedCount,
	}: {
		cologId: number;
		invitedCount: number;
		failedCount: number;
	}) =>
		captureAnalyticsEvent('colog member invitation completed', {
			colog_id: cologId,
			invited_count: invitedCount,
			failed_count: failedCount,
		}),
	cologMemberInvitationFailed: ({ cologId, errorCode }: { cologId: number; errorCode: string }) =>
		captureAnalyticsEvent('colog member invitation failed', { colog_id: cologId, error_code: errorCode }),
	contentLoadFailed: ({
		surface,
		loadPhase,
		errorCode,
		errorKind,
	}: { surface: ContentLoadSurface; loadPhase: ContentLoadPhase } & AnalyticsErrorProperties) =>
		captureAnalyticsEvent('content load failed', {
			surface,
			load_phase: loadPhase,
			error_code: errorCode,
			error_kind: errorKind,
		}),
	cologProfileUpdated: ({ changedFields }: { changedFields: CologProfileChangedField[] }) =>
		captureAnalyticsEvent('colog profile updated', { changed_fields: changedFields }),
	blogProfileViewed: ({ blogType }: { blogType: BlogType }) =>
		captureAnalyticsEvent('blog profile viewed', { blog_type: blogType }),
};
