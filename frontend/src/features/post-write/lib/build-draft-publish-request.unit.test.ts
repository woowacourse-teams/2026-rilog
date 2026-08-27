import { describe, expect, it, vi } from 'vitest';

import type { Block } from '@blocknote/core';

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
		blog: { id: 1, slug: 'rilog', name: 'Rilog' },
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
		});
		expect(uploadRepresentativeImage).not.toHaveBeenCalled();
	});
});
