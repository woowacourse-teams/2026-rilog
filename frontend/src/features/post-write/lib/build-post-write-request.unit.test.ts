import { describe, expect, it, vi } from 'vitest';

import type { Block } from '@blocknote/core';

import { getAnalyticsFailureStage } from '@/features/analytics/model/analytics-event';
import type { PublishPostCommand } from '@/features/post-write/model/post-publication';

import { buildPostWriteRequest } from './build-post-write-request';

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
		blog: { id: 1, slug: 'rilog', name: 'Rilog' },
		representativeImage: null,
		representativeImageUrl: 'posts/existing.png',
	},
});

describe('buildPostWriteRequest', () => {
	it('공통 Editor command를 게시글 API 요청으로 변환한다', async () => {
		const uploadRepresentativeImage = vi.fn();

		const request = await buildPostWriteRequest(createCommand(), uploadRepresentativeImage);

		expect(request).toEqual({
			slug: 'rilog',
			title: '게시글 제목',
			content: [paragraph],
			category: 'TECH',
			visibility: 'PUBLIC',
			thumbnailImageUrl: 'posts/existing.png',
		});
		expect(uploadRepresentativeImage).not.toHaveBeenCalled();
	});

	it('선택한 대표 이미지를 업로드한 object key를 요청에 사용한다', async () => {
		const image = new File(['image'], 'cover.png', { type: 'image/png' });
		const command = createCommand();
		command.settings.representativeImage = image;
		const uploadRepresentativeImage = vi.fn().mockResolvedValue('posts/uploaded.png');

		const request = await buildPostWriteRequest(command, uploadRepresentativeImage);

		expect(uploadRepresentativeImage).toHaveBeenCalledWith(image);
		expect(request.thumbnailImageUrl).toBe('posts/uploaded.png');
	});

	it('대표 이미지 업로드 실패 단계를 보존한다', async () => {
		const command = createCommand();
		command.settings.representativeImage = new File(['image'], 'cover.png', { type: 'image/png' });
		const uploadError = new TypeError('이미지 업로드 실패');
		const uploadRepresentativeImage = vi.fn().mockRejectedValue(uploadError);

		const error = await buildPostWriteRequest(command, uploadRepresentativeImage).catch((cause: unknown) => cause);

		expect(error).toBe(uploadError);
		expect(getAnalyticsFailureStage(error)).toBe('representative_image_upload');
	});
});
