import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import ImageUploader from './ImageUploader';

describe('ImageUploader', () => {
	it('FileUploader를 이미지 전용 input으로 제한한다', () => {
		render(<ImageUploader />);

		const input = screen.getByLabelText('이미지 선택');
		expect(input).toHaveAttribute('type', 'file');
		expect(input).toHaveAttribute('accept', 'image/*');
		expect(screen.queryByRole('img')).not.toBeInTheDocument();
	});

	it('선택한 이미지와 native change event를 그대로 전달한다', async () => {
		const user = userEvent.setup();
		const handleChange = vi.fn();
		const file = new File(['profile'], 'profile.png', { type: 'image/png' });

		render(<ImageUploader onChange={handleChange} />);

		const input = screen.getByLabelText('이미지 선택');
		await user.upload(input, file);

		expect((input as HTMLInputElement).files?.[0]).toBe(file);
		expect(handleChange).toHaveBeenCalledOnce();
	});

	it('문구, 상태와 native 속성 및 ref를 FileUploader에 전달한다', () => {
		const inputRef = createRef<HTMLInputElement>();

		render(
			<ImageUploader
				ref={inputRef}
				buttonLabel="대표 이미지 변경"
				name="post-thumbnail"
				status="error"
				helperText="이미지를 다시 선택해 주세요."
			/>,
		);

		const input = screen.getByLabelText('대표 이미지 변경');
		expect(input).toHaveAttribute('name', 'post-thumbnail');
		expect(input).toHaveAttribute('aria-invalid', 'true');
		expect(input).toHaveAccessibleDescription('이미지를 다시 선택해 주세요.');
		expect(inputRef.current).toBe(input);
	});

	it('pending 상태를 FileUploader에 전달한다', () => {
		render(<ImageUploader isPending />);

		const input = screen.getByLabelText('업로드 중');
		expect(input).toBeDisabled();
		expect(input).toHaveAttribute('aria-busy', 'true');
	});
});
