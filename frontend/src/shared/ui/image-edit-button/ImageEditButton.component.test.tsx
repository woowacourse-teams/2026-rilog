import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import ImageEditButton from './ImageEditButton';

describe('ImageEditButton', () => {
	it('현재 이미지 유무에 맞는 단일 action으로 파일을 선택한다', async () => {
		const user = userEvent.setup();
		const onFileChange = vi.fn();
		const { rerender } = render(<ImageEditButton imageLabel="팀 로고" hasImage={false} onFileChange={onFileChange} />);

		expect(screen.getByText('팀 로고 추가')).toBeInTheDocument();
		rerender(<ImageEditButton imageLabel="팀 로고" hasImage onFileChange={onFileChange} />);

		const file = new File(['logo'], 'logo.png', { type: 'image/png' });
		await user.upload(screen.getByLabelText('팀 로고 변경'), file);

		expect(screen.getByText('팀 로고 변경')).toBeInTheDocument();
		expect(onFileChange).toHaveBeenCalledWith(file);

		await user.upload(screen.getByLabelText('팀 로고 변경'), file);
		expect(onFileChange).toHaveBeenCalledTimes(2);
	});
});
