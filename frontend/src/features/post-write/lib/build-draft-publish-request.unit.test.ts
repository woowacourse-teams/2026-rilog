import { describe, expect, it, vi } from 'vitest';

import type { Block } from '@blocknote/core';

import { POST_THUMBNAIL_FALLBACK_URL } from '@/domains/post/lib/post-thumbnail';
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
		category: 'TECH',
		blog: { type: 'RILOG', slug: 'rilog' },
		chapterId: 12,
		representativeImage: null,
		representativeImageUrl: 'posts/existing.png',
	},
});

describe('buildDraftPublishRequest', () => {
	it('임시저장 글 발행 시 중첩된 빈 업로드 블록만 제거한다', async () => {
		const command = createCommand();
		const pendingImage: Block = {
			id: 'pending-image',
			type: 'image',
			props: {
				backgroundColor: 'default',
				textAlignment: 'left',
				name: '',
				url: '',
				caption: '',
				showPreview: true,
				previewWidth: 512,
			},
			content: undefined,
			children: [],
		};
		const parent = { ...paragraph, id: 'parent', children: [pendingImage, paragraph] };
		command.document.blocks = [parent];

		const request = await buildDraftPublishRequest(command, vi.fn());

		expect(request.content).toEqual([{ ...parent, children: [paragraph] }]);
		expect(command.document.blocks).toEqual([parent]);
	});

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

	it('회고 카테고리를 임시저장 발행 API 요청에 보존한다', async () => {
		const command = createCommand();
		command.settings.category = 'RETROSPECT';

		const request = await buildDraftPublishRequest(command, vi.fn());

		expect(request.category).toBe('RETROSPECT');
	});

	it('대표 이미지를 제거하면 본문 이미지가 있어도 기본 썸네일을 요청에 사용한다', async () => {
		const command = createCommand();
		command.document.blocks = [
			{
				...paragraph,
				type: 'image',
				props: { ...paragraph.props, url: 'https://example.com/body.png' },
			} as unknown as Block,
		];
		command.settings.representativeImageUrl = POST_THUMBNAIL_FALLBACK_URL;

		const request = await buildDraftPublishRequest(command, vi.fn());

		expect(request.thumbnailImageUrl).toBe(POST_THUMBNAIL_FALLBACK_URL);
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

describe('buildDraftPublishRequest 미디어 저장 경계', () => {
	it('정상 썸네일로 바꿔도 본문 Base64가 남으면 요청 생성을 거부한다', async () => {
		const command = createCommand();
		command.document.blocks = [
			{
				...paragraph,
				type: 'image',
				props: { ...paragraph.props, url: 'data:image/heic;base64,private-image' },
			} as unknown as Block,
		];
		const upload = vi.fn();

		await expect(buildDraftPublishRequest(command, upload)).rejects.toThrow('파일로 다시 업로드');
		expect(upload).not.toHaveBeenCalled();
	});
});

describe('buildDraftPublishRequest 대표 이미지 경계', () => {
	it('본문에 Base64가 있으면 새 대표 이미지 업로드도 시작하지 않는다', async () => {
		const command = createCommand();
		command.document.blocks = [
			{
				...paragraph,
				type: 'image',
				props: { ...paragraph.props, url: 'data:image/png;base64,x' },
			} as unknown as Block,
		];
		command.settings.representativeImage = new File(['cover'], 'cover.png', { type: 'image/png' });
		const upload = vi.fn();
		await expect(buildDraftPublishRequest(command, upload)).rejects.toThrow('파일로 다시 업로드');
		expect(upload).not.toHaveBeenCalled();
	});

	it.each(['data:image/png;base64,x', ' blob:preview '])(
		'최종 대표 이미지 %s가 임시 주소이면 요청을 거부한다',
		async (url) => {
			const command = createCommand();
			command.settings.representativeImageUrl = url;
			await expect(buildDraftPublishRequest(command, vi.fn())).rejects.toThrow('파일로 다시 업로드');
		},
	);

	it('선택 파일의 미리보기가 blob이어도 업로드한 최종 URL을 사용한다', async () => {
		const command = createCommand();
		command.settings.representativeImageUrl = 'blob:preview';
		command.settings.representativeImage = new File(['cover'], 'cover.png', { type: 'image/png' });
		const result = await buildDraftPublishRequest(command, vi.fn().mockResolvedValue('posts/cover.png'));
		expect(result.thumbnailImageUrl).toBe('posts/cover.png');
	});

	it('업로드 결과가 blob 주소이면 요청을 거부한다', async () => {
		const command = createCommand();
		command.settings.representativeImage = new File(['cover'], 'cover.png', { type: 'image/png' });
		await expect(buildDraftPublishRequest(command, vi.fn().mockResolvedValue('blob:uploaded'))).rejects.toThrow(
			'파일로 다시 업로드',
		);
	});
});
