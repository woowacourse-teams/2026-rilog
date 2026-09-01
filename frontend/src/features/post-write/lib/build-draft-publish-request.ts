import { POST_THUMBNAIL_FALLBACK_URL } from '@/domains/post/lib/post-thumbnail';
import { withAnalyticsFailureStage } from '@/features/analytics/model/analytics-event';
import type { PublishPostCommand } from '@/features/post-write/model/post-publication';
import type { DraftPublishRequest } from '@/shared/api/drafts/types';

import { findFirstBodyImageUrl } from './resolve-representative-image';

type UploadRepresentativeImage = (file: File) => Promise<string>;

export const buildDraftPublishRequest = async (
	{ document, settings }: PublishPostCommand,
	uploadRepresentativeImage: UploadRepresentativeImage,
): Promise<DraftPublishRequest> => {
	if (settings.blog === null) {
		throw new Error('코로그를 선택해 주세요.');
	}

	let thumbnailImageUrl =
		settings.representativeImageUrl ?? findFirstBodyImageUrl(document.blocks) ?? POST_THUMBNAIL_FALLBACK_URL;
	if (settings.representativeImage !== null) {
		try {
			thumbnailImageUrl = await uploadRepresentativeImage(settings.representativeImage);
		} catch (error) {
			throw withAnalyticsFailureStage(error, 'representative_image_upload');
		}
	}

	return {
		slug: settings.blog.slug,
		title: document.title,
		content: document.blocks,
		category: settings.category === 'IT' ? 'TECH' : settings.category,
		visibility: 'PUBLIC',
		thumbnailImageUrl,
	};
};
