import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { POST_THUMBNAIL_FALLBACK_URL } from '@/domains/post/lib/post-thumbnail';

import { usePostPublicationSettings } from './use-post-publication-settings';

afterEach(() => {
	vi.unstubAllGlobals();
});

describe('usePostPublicationSettings', () => {
	it('초기 설정을 유지하고 Co-log 선택 오류를 설정 변경과 함께 관리한다', () => {
		const initialSettings = {
			category: 'DAILY' as const,
			blog: null,
			chapterId: 4,
			representativeImage: null,
			representativeImageUrl: 'posts/existing-thumbnail.png',
		};
		const { result } = renderHook(() => usePostPublicationSettings({ initialSettings }));

		expect(result.current.settings).toBe(initialSettings);
		expect(result.current.representativeImagePreviewUrl).toBe('posts/existing-thumbnail.png');

		act(() => expect(result.current.validatePublicationSettings('COLOG')).toBe(false));
		expect(result.current.cologError).toBe('Colog를 선택해 주세요.');

		act(() => {
			result.current.handleCategoryChange('IT');
			result.current.handleTargetBlogChange({ type: 'COLOG', id: 7, slug: 'rilog-team' });
		});

		expect(result.current.settings).toMatchObject({
			category: 'IT',
			blog: { type: 'COLOG', id: 7, slug: 'rilog-team' },
			chapterId: null,
		});
		expect(result.current.cologError).toBeUndefined();
		act(() => expect(result.current.validatePublicationSettings('COLOG')).toBe(true));

		act(() => result.current.handleChapterChange(12));
		expect(result.current.settings.chapterId).toBe(12);
	});

	it('선택 이미지를 교체·제거·unmount할 때 생성한 object URL만 해제한다', () => {
		const createObjectUrl = vi.fn().mockReturnValueOnce('blob:first-cover').mockReturnValueOnce('blob:second-cover');
		const revokeObjectUrl = vi.fn();
		vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl }));
		const { result, unmount } = renderHook(() =>
			usePostPublicationSettings({
				initialSettings: {
					category: 'IT',
					blog: null,
					chapterId: null,
					representativeImage: null,
					representativeImageUrl: 'posts/existing-thumbnail.png',
				},
			}),
		);
		const firstImage = new File(['first'], 'first.png', { type: 'image/png' });
		const secondImage = new File(['second'], 'second.png', { type: 'image/png' });

		act(() => result.current.handleImageChange(firstImage));
		expect(result.current.representativeImagePreviewUrl).toBe('blob:first-cover');
		expect(result.current.settings).toMatchObject({
			representativeImage: firstImage,
			representativeImageUrl: null,
		});

		act(() => result.current.handleImageChange(null));
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:first-cover');
		expect(result.current.representativeImagePreviewUrl).toBe(POST_THUMBNAIL_FALLBACK_URL);
		expect(result.current.settings).toMatchObject({
			representativeImage: null,
			representativeImageUrl: POST_THUMBNAIL_FALLBACK_URL,
		});

		act(() => result.current.handleImageChange(secondImage));
		unmount();
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:second-cover');
		expect(revokeObjectUrl).not.toHaveBeenCalledWith('posts/existing-thumbnail.png');
	});

	it('발행 완료 시 선택한 object URL을 즉시 해제한다', () => {
		const createObjectUrl = vi.fn(() => 'blob:selected-cover');
		const revokeObjectUrl = vi.fn();
		vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl }));
		const { result } = renderHook(() => usePostPublicationSettings());

		act(() => result.current.handleImageChange(new File(['image'], 'cover.png', { type: 'image/png' })));
		act(() => result.current.clearSelectedImageUrl());

		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:selected-cover');
		expect(result.current.representativeImagePreviewUrl).toBeNull();
	});
});
