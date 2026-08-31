import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ComponentProps } from 'react';

import { POST_THUMBNAIL_FALLBACK_URL } from '@/domains/post/lib/post-thumbnail';

import PublishSettingsModal from './PublishSettingsModal';

const DEFAULT_PROPS: ComponentProps<typeof PublishSettingsModal> = {
	open: true,
	postTitle: '게시글 제목',
	settings: { category: 'IT', blog: null, representativeImage: null, representativeImageUrl: null },
	selectedImageUrl: null,
	bodyBlocks: [],
	defaultImageUrl: POST_THUMBNAIL_FALLBACK_URL,
	cologOptions: [
		{ id: 1, slug: 'first-colog', name: '첫 번째 Co-log' },
		{ id: 2, slug: 'second-colog', name: '두 번째 Co-log' },
	],
	isPublishing: false,
	onClose: vi.fn(),
	onCategoryChange: vi.fn(),
	onCoLogChange: vi.fn(),
	onImageChange: vi.fn(),
	onPublish: vi.fn(),
};

const renderModal = (overrides: Partial<ComponentProps<typeof PublishSettingsModal>> = {}) =>
	render(<PublishSettingsModal {...DEFAULT_PROPS} {...overrides} />);

describe('PublishSettingsModal', () => {
	it('피드와 상세 화면의 기본 썸네일을 미리보기로 표시한다', () => {
		renderModal();

		const previewImage = screen.getByRole('img', { name: '게시글 대표 이미지 미리보기' });
		expect(previewImage).toHaveAttribute('src', POST_THUMBNAIL_FALLBACK_URL);
		expect(previewImage.parentElement).toHaveClass('bg-thumbnail-background');
	});

	it('선택 가능한 Co-log가 하나뿐이면 빈 선택값을 자동으로 채운다', async () => {
		const handleCoLogChange = vi.fn();
		renderModal({
			cologOptions: [{ id: 9, slug: 'only-colog', name: '유일한 Co-log' }],
			onCoLogChange: handleCoLogChange,
		});

		await waitFor(() =>
			expect(handleCoLogChange).toHaveBeenCalledWith({ id: 9, slug: 'only-colog', name: '유일한 Co-log' }),
		);
	});

	it('기존 Co-log 선택값은 자동 선택으로 덮어쓰지 않는다', () => {
		const handleCoLogChange = vi.fn();
		renderModal({
			settings: { ...DEFAULT_PROPS.settings, blog: { id: 4, slug: 'selected-colog', name: '선택된 Co-log' } },
			cologOptions: [{ id: 9, slug: 'only-colog', name: '유일한 Co-log' }],
			onCoLogChange: handleCoLogChange,
		});

		expect(handleCoLogChange).not.toHaveBeenCalled();
	});

	it('개인 블로그에는 시리즈를, Co-log에는 챕터를 선택할 수 있다', () => {
		const { rerender } = renderModal();

		expect(screen.getByRole('combobox', { name: '시리즈' })).toHaveDisplayValue('시리즈를 선택하세요');
		expect(screen.getByRole('option', { name: '프론트엔드 성장 기록' })).toBeInTheDocument();

		rerender(
			<PublishSettingsModal
				{...DEFAULT_PROPS}
				settings={{
					...DEFAULT_PROPS.settings,
					blog: { id: 1, slug: 'first-colog', name: '첫 번째 Co-log' },
				}}
			/>,
		);

		expect(screen.getByRole('combobox', { name: '챕터' })).toHaveDisplayValue('챕터를 선택하세요');
		expect(screen.getByRole('option', { name: '개발' })).toBeInTheDocument();
	});

	it('대표 이미지를 선택하고 제거할 수 있다', async () => {
		const user = userEvent.setup();
		const handleImageChange = vi.fn();
		const imageFile = new File(['image'], 'cover.png', { type: 'image/png' });
		const { rerender } = renderModal({ onImageChange: handleImageChange });

		await user.upload(screen.getByLabelText('이미지 선택'), imageFile);
		expect(handleImageChange).toHaveBeenCalledWith(imageFile);

		rerender(
			<PublishSettingsModal
				{...DEFAULT_PROPS}
				settings={{ ...DEFAULT_PROPS.settings, representativeImage: imageFile }}
				onImageChange={handleImageChange}
			/>,
		);
		await user.click(screen.getByRole('button', { name: '이미지 제거' }));
		expect(handleImageChange).toHaveBeenLastCalledWith(null);
	});

	it('기존 대표 이미지 URL이 있으면 변경과 제거 동작을 제공한다', async () => {
		const user = userEvent.setup();
		const handleImageChange = vi.fn();
		renderModal({
			settings: { ...DEFAULT_PROPS.settings, representativeImageUrl: 'posts/existing-thumbnail.png' },
			selectedImageUrl: 'posts/existing-thumbnail.png',
			onImageChange: handleImageChange,
		});

		expect(screen.getByLabelText('이미지 변경')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '이미지 제거' }));

		expect(handleImageChange).toHaveBeenCalledWith(null);
	});

	it('발행 중에는 설정 변경과 모든 종료 경로를 막는다', async () => {
		const user = userEvent.setup();
		const handleClose = vi.fn();
		renderModal({ isPublishing: true, onClose: handleClose });

		const dialog = screen.getByRole('dialog', { name: '게시 설정' });
		expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
		expect(screen.getByRole('button', { name: '발행' })).toBeDisabled();
		expect(screen.getByRole('combobox', { name: '코로그' })).toBeDisabled();
		expect(screen.getByRole('combobox', { name: '시리즈' })).toBeDisabled();
		expect(screen.getByLabelText('이미지 선택')).toBeDisabled();

		fireEvent.click(dialog);
		fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
		await user.keyboard('{Escape}');
		expect(handleClose).not.toHaveBeenCalled();
	});

	it('Co-log 오류를 select와 연결하고 발행 시 해당 입력으로 focus한다', async () => {
		const user = userEvent.setup();
		const handlePublish = vi.fn();
		renderModal({ cologError: 'Co-log를 선택해 주세요.', onPublish: handlePublish });

		const cologSelect = screen.getByRole('combobox', { name: '코로그' });
		const error = screen.getByRole('alert');
		expect(cologSelect).toHaveAttribute('aria-describedby', error.id);

		await user.click(screen.getByRole('button', { name: '발행' }));
		expect(cologSelect).toHaveFocus();
		expect(handlePublish).toHaveBeenCalledOnce();
	});
});
