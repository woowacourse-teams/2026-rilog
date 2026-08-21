import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ImageEditMenu from './ImageEditMenu';

describe('ImageEditMenu', () => {
	it('이미지 변경 메뉴에서 새 이미지를 선택하고 메뉴를 닫는다', async () => {
		const user = userEvent.setup();
		const onFileChange = vi.fn();
		render(<ImageEditMenu imageLabel="팀 로고" hasImage onFileChange={onFileChange} onReset={vi.fn()} />);

		const trigger = screen.getByText('팀 로고 변경').closest('summary')!;
		await user.click(trigger);
		expect(trigger.parentElement).toHaveAttribute('open');

		const file = new File(['logo'], 'logo.png', { type: 'image/png' });
		await user.upload(screen.getByLabelText('새 팀 로고 업로드'), file);

		expect(onFileChange).toHaveBeenCalledWith(file);
		expect(trigger.parentElement).not.toHaveAttribute('open');
	});

	it('기존 이미지를 기본 이미지로 되돌린다', async () => {
		const user = userEvent.setup();
		const onReset = vi.fn();
		render(<ImageEditMenu imageLabel="커버 이미지" hasImage onFileChange={vi.fn()} onReset={onReset} />);

		await user.click(screen.getByText('커버 이미지 변경'));
		await user.click(screen.getByRole('button', { name: '기본 이미지로 되돌리기' }));

		expect(onReset).toHaveBeenCalledOnce();
	});

	it('기본 이미지 상태에서는 제거 action을 제공하지 않는다', async () => {
		const user = userEvent.setup();
		render(<ImageEditMenu imageLabel="프로필 이미지" hasImage={false} onFileChange={vi.fn()} onReset={vi.fn()} />);

		await user.click(screen.getByText('프로필 이미지 추가'));

		expect(screen.getByLabelText('프로필 이미지 업로드')).toBeInTheDocument();
		expect(screen.queryByRole('button', { name: '기본 이미지로 되돌리기' })).not.toBeInTheDocument();
	});
});
