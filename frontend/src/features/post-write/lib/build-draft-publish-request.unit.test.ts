import { describe, expect, it, vi } from 'vitest';

import type { Block } from '@blocknote/core';

import { getAnalyticsFailureStage } from '@/features/analytics/model/analytics-event';
import type { PublishPostCommand } from '@/features/post-write/model/post-publication';

import { buildDraftPublishRequest } from './build-draft-publish-request';

const paragraph: Block = {
	id: 'paragraph',
	type: 'paragraph',
	props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
	content: [],
	children: [],
};

const createCommand = (): PublishPostCommand => ({
	document: { title: '게시글 제목', blocks: [paragraph] },
	settings: {
		category: 'IT',
		blog: { type: 'RILOG', slug: 'rilog' },
		chapterId: 12,
		representativeImage: null,
		representativeImageUrl: 'posts/existing.png',
	},
});

describe('buildDraftPublishRequest', () => {
	it('공통 Editor command를 독립적인 임시저장 발행 API 요청으로 변환한다', async () => {
		const uploadRepresentativeImage = vi.fn();

		const request = await buildDraftPublishRequest(createCommand(), uploadRepresentativeImage);

		expect(request).toEqual({
			slug: 'rilog',
			title: '게시글 제목',
			content: [paragraph],
			category: 'TECH',
			visibility: 'PUBLIC',
			thumbnailImageUrl: 'posts/existing.png',
			chapterId: 12,
		});
		expect(uploadRepresentativeImage).not.toHaveBeenCalled();
	});

	it('대표 이미지 업로드 실패 단계를 보존한다', async () => {
		const command = createCommand();
		command.settings.representativeImage = new File(['image'], 'cover.png', { type: 'image/png' });
		const uploadError = new TypeError('이미지 업로드 실패');
		const uploadRepresentativeImage = vi.fn().mockRejectedValue(uploadError);

		const error = await buildDraftPublishRequest(command, uploadRepresentativeImage).catch((cause: unknown) => cause);

		expect(error).toBe(uploadError);
		expect(getAnalyticsFailureStage(error)).toBe('representative_image_upload');
	});
});
