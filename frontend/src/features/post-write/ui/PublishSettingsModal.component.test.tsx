import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

	it('Co-log는 선택 안 함을 기본값으로 제공하고 선택 후 다시 해제할 수 있다', async () => {
		const user = userEvent.setup();
		const handleCoLogChange = vi.fn();
		const onlyColog = { id: 9, slug: 'only-colog', name: '유일한 Co-log' };
		const { rerender } = renderModal({
			cologOptions: [onlyColog],
			onCoLogChange: handleCoLogChange,
		});

		const cologSelect = screen.getByRole('combobox', { name: '코로그' });
		expect(cologSelect).toHaveClass('native-select');
		expect(cologSelect).toHaveDisplayValue('선택 안 함');
		expect(handleCoLogChange).not.toHaveBeenCalled();

		await user.selectOptions(cologSelect, '9');
		expect(handleCoLogChange).toHaveBeenLastCalledWith(onlyColog);

		rerender(
			<PublishSettingsModal
				{...DEFAULT_PROPS}
				settings={{ ...DEFAULT_PROPS.settings, blog: onlyColog }}
				cologOptions={[onlyColog]}
				onCoLogChange={handleCoLogChange}
			/>,
		);

		await user.selectOptions(screen.getByRole('combobox', { name: '코로그' }), '');
		expect(handleCoLogChange).toHaveBeenLastCalledWith(null);
	});

	it('개인 블로그에는 시리즈를, Co-log에는 챕터를 선택할 수 있다', () => {
		const { rerender } = renderModal();

		const seriesSelect = screen.getByRole('combobox', { name: '시리즈' });
		expect(seriesSelect).toHaveClass('native-select');
		expect(seriesSelect).toHaveDisplayValue('선택 안 함');
		expect(within(seriesSelect).getByRole('option', { name: '선택 안 함' })).toHaveValue('');
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

		const chapterSelect = screen.getByRole('combobox', { name: '챕터' });
		expect(chapterSelect).toHaveDisplayValue('선택 안 함');
		expect(within(chapterSelect).getByRole('option', { name: '선택 안 함' })).toHaveValue('');
		expect(screen.getByRole('option', { name: '개발' })).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '새 시리즈 추가' })).not.toBeInTheDocument();
	});

	it('새 시리즈를 생성하는 동안 모달 action을 잠그고 성공한 시리즈를 선택한다', async () => {
		const user = userEvent.setup();
		let resolveCreateChapter!: (option: { value: string; label: string }) => void;
		const handleCreateChapter = vi.fn(
			() =>
				new Promise<{ value: string; label: string }>((resolve) => {
					resolveCreateChapter = resolve;
				}),
		);
		const handlePublish = vi.fn();
		renderModal({ onCreateChapter: handleCreateChapter, onPublish: handlePublish });

		await user.click(screen.getByRole('button', { name: '새 시리즈 추가' }));
		const seriesNameInput = screen.getByRole('textbox', { name: '새로운 시리즈 이름' });
		expect(seriesNameInput).toHaveFocus();
		expect(seriesNameInput).toHaveAttribute('placeholder', '새로운 시리즈 이름을 입력하세요.');

		await user.type(seriesNameInput, '새 시리즈{Enter}');
		await waitFor(() => expect(handleCreateChapter).toHaveBeenCalledWith('새 시리즈'));

		expect(handlePublish).not.toHaveBeenCalled();
		expect(seriesNameInput).toBeDisabled();
		expect(screen.getByRole('button', { name: '시리즈 추가 취소' })).toBeDisabled();
		expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
		expect(screen.getByRole('button', { name: '발행' })).toBeDisabled();
		expect(screen.getByLabelText('이미지 선택')).toBeDisabled();
		expect(screen.getByRole('combobox', { name: '코로그' })).toBeDisabled();
		expect(screen.getByRole('combobox', { name: '시리즈' })).toBeDisabled();
		expect(screen.getAllByRole('radio')[0]).toBeDisabled();

		act(() => {
			resolveCreateChapter({ value: 'new-series', label: '새 시리즈' });
		});

		await waitFor(() => expect(screen.getByRole('combobox', { name: '시리즈' })).toHaveDisplayValue('새 시리즈'));
		expect(screen.queryByRole('textbox', { name: '새로운 시리즈 이름' })).not.toBeInTheDocument();
	});

	it('시리즈 이름 input이 열리면 추가 버튼을 취소 버튼으로 바꾸고 입력값을 초기화한다', async () => {
		const user = userEvent.setup();
		renderModal();

		await user.click(screen.getByRole('button', { name: '새 시리즈 추가' }));
		const seriesNameInput = screen.getByRole('textbox', { name: '새로운 시리즈 이름' });
		await user.type(seriesNameInput, '작성 중인 이름');

		await user.click(screen.getByRole('button', { name: '시리즈 추가 취소' }));
		expect(screen.queryByRole('textbox', { name: '새로운 시리즈 이름' })).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: '새 시리즈 추가' }));
		expect(screen.getByRole('textbox', { name: '새로운 시리즈 이름' })).toHaveValue('');
	});

	it('시리즈 생성에 실패하면 input에 오류 메시지를 표시한다', async () => {
		const user = userEvent.setup();
		const handleCreateChapter = vi.fn().mockRejectedValue(new Error('이미 사용 중인 시리즈 이름입니다.'));
		renderModal({ onCreateChapter: handleCreateChapter });

		await user.click(screen.getByRole('button', { name: '새 시리즈 추가' }));
		const seriesNameInput = screen.getByRole('textbox', { name: '새로운 시리즈 이름' });
		await user.type(seriesNameInput, '중복 시리즈{Enter}');

		await waitFor(() => expect(seriesNameInput).toHaveAccessibleDescription('이미 사용 중인 시리즈 이름입니다.'));
		expect(seriesNameInput).toHaveAttribute('aria-invalid', 'true');
		expect(seriesNameInput).toBeEnabled();
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
