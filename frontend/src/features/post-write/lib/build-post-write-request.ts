import { POST_THUMBNAIL_FALLBACK_URL } from '@/domains/post/lib/post-thumbnail';
import { withAnalyticsFailureStage } from '@/features/analytics/model/analytics-event';
import type { PublishPostCommand } from '@/features/post-write/model/post-publication';
import type { PostWriteRequest } from '@/shared/api/posts/types';

import { findFirstBodyImageUrl } from './resolve-representative-image';

type UploadRepresentativeImage = (file: File) => Promise<string>;

export const buildPostWriteRequest = async (
	{ document, settings }: PublishPostCommand,
	uploadRepresentativeImage: UploadRepresentativeImage,
): Promise<PostWriteRequest> => {
	if (settings.blog === null) {
		throw new Error('Colog를 선택해 주세요.');
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
		// TODO: 공개 범위 선택 UI가 추가되면 사용자 선택값으로 교체한다.
		visibility: 'PUBLIC',
		thumbnailImageUrl,
		chapterId: settings.chapterId,
	};
};
