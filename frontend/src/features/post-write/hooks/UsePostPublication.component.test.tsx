import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { EditorDocument, PublicationSettings, PublishPost, PublishPostResult } from '../model/post-publication';

import { usePostPublication } from './use-post-publication';

const document: EditorDocument = {
	title: '발행할 글',
	blocks: [
		{
			id: 'paragraph',
			type: 'paragraph',
			props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
			content: [],
			children: [],
		},
	],
};

const settings: PublicationSettings = {
	category: 'IT',
	blog: { type: 'COLOG', id: 7, slug: 'rilog-team' },
	representativeImage: null,
	representativeImageUrl: null,
};

describe('usePostPublication', () => {
	it('발행할 문서 snapshot과 모달 상태를 열고 닫는다', () => {
		const publishPost = vi.fn<PublishPost>();
		const { result } = renderHook(() => usePostPublication({ publishPost, onPublished: vi.fn() }));

		act(() => result.current.open(document));
		expect(result.current.document).toBe(document);
		expect(result.current.isModalOpen).toBe(true);

		act(() => result.current.close());
		expect(result.current.isModalOpen).toBe(false);
		expect(result.current.publishError).toBeUndefined();
	});

	it('발행 중 중복 요청을 막고 성공 callback 완료 후 모달을 닫는다', async () => {
		let resolvePublish: ((result: PublishPostResult) => void) | undefined;
		const publishPost = vi.fn<PublishPost>(
			() =>
				new Promise((resolve) => {
					resolvePublish = resolve;
				}),
		);
		const onPublished = vi.fn();
		const { result } = renderHook(() => usePostPublication({ publishPost, onPublished }));
		act(() => result.current.open(document));

		let firstPublish: Promise<void> | undefined;
		await act(async () => {
			firstPublish = result.current.publish(settings);
			await result.current.publish(settings);
		});

		expect(publishPost).toHaveBeenCalledOnce();
		expect(result.current.isPublishing).toBe(true);

		await act(async () => {
			resolvePublish?.({ postId: '31', slug: 'rilog-team' });
			await firstPublish;
		});

		expect(onPublished).toHaveBeenCalledWith({ postId: '31', slug: 'rilog-team' }, settings, expect.any(Object));
		expect(result.current.isPublishing).toBe(false);
		expect(result.current.isModalOpen).toBe(false);
	});

	it('발행 또는 성공 후속 처리 실패 시 문서와 모달을 유지하고 오류를 제공한다', async () => {
		const publishPost = vi
			.fn<PublishPost>()
			.mockRejectedValueOnce(new Error('발행 API 실패'))
			.mockResolvedValueOnce({ postId: 'invalid', slug: 'rilog-team' });
		const onPublished = vi.fn(() => {
			throw new Error('상세 경로 생성 실패');
		});
		const { result } = renderHook(() => usePostPublication({ publishPost, onPublished }));
		act(() => result.current.open(document));

		await act(() => result.current.publish(settings));
		expect(result.current.publishError).toBe('발행 API 실패');
		expect(result.current.document).toBe(document);
		expect(result.current.isModalOpen).toBe(true);

		await act(() => result.current.publish(settings));
		expect(result.current.publishError).toBe('상세 경로 생성 실패');
		expect(result.current.isPublishing).toBe(false);
		expect(result.current.isModalOpen).toBe(true);
	});
});
