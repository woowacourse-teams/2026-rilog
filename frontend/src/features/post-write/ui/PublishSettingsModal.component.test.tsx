import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { ComponentProps } from 'react';

import PublishSettingsModal from './PublishSettingsModal';

const DEFAULT_PROPS: ComponentProps<typeof PublishSettingsModal> = {
	open: true,
	postTitle: '게시글 제목',
	settings: { category: 'IT', blog: null, representativeImage: null },
	selectedImageUrl: null,
	bodyBlocks: [],
	defaultImageUrl: '/images/default-post-cover.svg',
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

	it('발행 중에는 설정 변경과 모든 종료 경로를 막는다', async () => {
		const user = userEvent.setup();
		const handleClose = vi.fn();
		renderModal({ isPublishing: true, onClose: handleClose });

		const dialog = screen.getByRole('dialog', { name: '게시 설정' });
		expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
		expect(screen.getByRole('button', { name: '발행' })).toBeDisabled();
		expect(screen.getByRole('combobox', { name: 'Co-log' })).toBeDisabled();
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

		const cologSelect = screen.getByRole('combobox', { name: 'Co-log' });
		const error = screen.getByRole('alert');
		expect(cologSelect).toHaveAttribute('aria-describedby', error.id);

		await user.click(screen.getByRole('button', { name: '발행' }));
		expect(cologSelect).toHaveFocus();
		expect(handlePublish).toHaveBeenCalledOnce();
	});
});
