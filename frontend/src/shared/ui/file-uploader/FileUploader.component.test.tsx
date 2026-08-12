import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import FileUploader from './FileUploader';

describe('FileUploader', () => {
	it('파일 종류를 제한하지 않는 범용 file input을 제공한다', () => {
		render(<FileUploader />);

		const input = screen.getByLabelText('파일 선택');
		expect(input).toHaveAttribute('type', 'file');
		expect(input).not.toHaveAttribute('accept');
	});

	it('선택한 파일과 native change event를 전달한다', async () => {
		const user = userEvent.setup();
		const handleChange = vi.fn();
		const file = new File(['rilog'], 'rilog.txt', { type: 'text/plain' });

		render(<FileUploader accept="text/plain" onChange={handleChange} />);

		const input = screen.getByLabelText('파일 선택');
		await user.upload(input, file);

		expect(input).toHaveAttribute('accept', 'text/plain');
		expect((input as HTMLInputElement).files?.[0]).toBe(file);
		expect(handleChange).toHaveBeenCalledOnce();
	});

	it('multiple과 native 속성 및 ref를 input에 전달한다', () => {
		const inputRef = createRef<HTMLInputElement>();

		render(<FileUploader ref={inputRef} multiple name="attachments" buttonLabel="첨부 파일 선택" />);

		const input = screen.getByLabelText('첨부 파일 선택');
		expect(input).toHaveAttribute('multiple');
		expect(input).toHaveAttribute('name', 'attachments');
		expect(inputRef.current).toBe(input);
	});

	it('pending 상태에서는 파일 선택을 막고 진행 상태를 알린다', () => {
		render(<FileUploader isPending />);

		const input = screen.getByLabelText('업로드 중');
		expect(input).toBeDisabled();
		expect(input).toHaveAttribute('aria-busy', 'true');
	});

	it('disabled와 접근성 설명을 native input에 전달한다', () => {
		render(
			<>
				<p id="attachment-guide">10MB 이하의 파일만 첨부할 수 있어요.</p>
				<FileUploader disabled aria-describedby="attachment-guide" />
			</>,
		);

		const input = screen.getByLabelText('파일 선택');
		expect(input).toBeDisabled();
		expect(input).toHaveAccessibleDescription('10MB 이하의 파일만 첨부할 수 있어요.');
	});
});
