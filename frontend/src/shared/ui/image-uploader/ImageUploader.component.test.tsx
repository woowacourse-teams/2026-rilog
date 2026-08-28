import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import ImageUploader from './ImageUploader';

describe('ImageUploader', () => {
	it('FileUploader를 이미지 전용 input으로 제한한다', () => {
		render(<ImageUploader />);

		const input = screen.getByLabelText('이미지 변경');
		expect(input).toHaveAttribute('type', 'file');
		expect(input).toHaveAttribute('accept', 'image/*');
		expect(screen.queryByRole('img')).not.toBeInTheDocument();
	});

	it('선택한 단일 이미지와 native change event를 그대로 전달한다', async () => {
		const user = userEvent.setup();
		const handleChange = vi.fn();
		const handleFileChange = vi.fn();
		const file = new File(['profile'], 'profile.png', { type: 'image/png' });

		render(<ImageUploader onChange={handleChange} onFileChange={handleFileChange} />);

		const input = screen.getByLabelText('이미지 변경');
		await user.upload(input, file);

		expect((input as HTMLInputElement).files?.[0]).toBe(file);
		expect(handleFileChange).toHaveBeenCalledWith(file);
		expect(handleChange).toHaveBeenCalledOnce();
	});

	it('비이미지 파일은 전달하지 않고 input을 초기화한다', async () => {
		const user = userEvent.setup({ applyAccept: false });
		const handleFileChange = vi.fn();
		const file = new File(['not-an-image'], 'profile.txt', { type: 'text/plain' });

		render(<ImageUploader onFileChange={handleFileChange} />);

		const input = screen.getByLabelText('이미지 변경');
		await user.upload(input, file);

		expect((input as HTMLInputElement).files).toHaveLength(0);
		expect(handleFileChange).not.toHaveBeenCalled();
	});

	it('추가 이미지 검증과 거절 콜백을 FileUploader에 전달한다', async () => {
		const user = userEvent.setup();
		const handleFileChange = vi.fn();
		const handleFileRejected = vi.fn();
		const validateFile = vi.fn(() => false);
		const file = new File(['oversized'], 'cover.png', { type: 'image/png' });

		render(
			<ImageUploader onFileChange={handleFileChange} onFileRejected={handleFileRejected} validateFile={validateFile} />,
		);

		await user.upload(screen.getByLabelText('이미지 변경'), file);

		expect(validateFile).toHaveBeenCalledWith(file);
		expect(handleFileChange).not.toHaveBeenCalled();
		expect(handleFileRejected).toHaveBeenCalledWith(file);
	});

	it('문구와 native 속성 및 ref를 FileUploader에 전달한다', () => {
		const inputRef = createRef<HTMLInputElement>();

		render(<ImageUploader ref={inputRef} buttonLabel="대표 이미지 변경" name="post-thumbnail" />);

		const input = screen.getByLabelText('대표 이미지 변경');
		expect(input).toHaveAttribute('name', 'post-thumbnail');
		expect(inputRef.current).toBe(input);
	});

	it('pending 상태를 FileUploader에 전달한다', () => {
		render(<ImageUploader isPending />);

		const input = screen.getByLabelText('업로드 중');
		expect(input).toBeDisabled();
		expect(input).toHaveAttribute('aria-busy', 'true');
	});
});
