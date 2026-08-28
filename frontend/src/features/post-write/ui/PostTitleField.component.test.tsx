import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import PostTitleField from './PostTitleField';

interface ControlledPostTitleFieldProps {
	onEnter?: () => void;
}

function ControlledPostTitleField({ onEnter = vi.fn() }: ControlledPostTitleFieldProps) {
	const [value, setValue] = useState('');
	const inputRef = createRef<HTMLTextAreaElement>();

	return <PostTitleField value={value} inputRef={inputRef} onChange={setValue} onEnter={onEnter} />;
}

describe('PostTitleField', () => {
	it('제목에서 Enter를 누르면 줄바꿈 대신 본문 이동을 요청한다', async () => {
		const user = userEvent.setup();
		const handleEnter = vi.fn();
		render(<ControlledPostTitleField onEnter={handleEnter} />);

		const titleField = screen.getByRole('textbox', { name: '게시글 제목' });
		await user.type(titleField, '제목{enter}');

		expect(titleField).toHaveValue('제목');
		expect(handleEnter).toHaveBeenCalledOnce();
	});

	it('한글 조합 중 Enter는 본문 이동으로 처리하지 않는다', () => {
		const handleEnter = vi.fn();
		render(<ControlledPostTitleField onEnter={handleEnter} />);

		fireEvent.keyDown(screen.getByRole('textbox', { name: '게시글 제목' }), {
			key: 'Enter',
			isComposing: true,
		});

		expect(handleEnter).not.toHaveBeenCalled();
	});

	it('입력 내용의 scrollHeight만큼 높이를 확장한다', async () => {
		const user = userEvent.setup();
		render(<ControlledPostTitleField />);

		const titleField = screen.getByRole('textbox', { name: '게시글 제목' });
		Object.defineProperty(titleField, 'scrollHeight', { configurable: true, value: 96 });
		await user.type(titleField, '긴 제목');

		expect(titleField).toHaveStyle({ height: '96px' });
	});

	it('오류 메시지를 제목 입력란에 연결한다', () => {
		const inputRef = createRef<HTMLTextAreaElement>();
		render(
			<PostTitleField
				value=""
				error="제목을 입력해 주세요."
				inputRef={inputRef}
				onChange={vi.fn()}
				onEnter={vi.fn()}
			/>,
		);

		const titleField = screen.getByRole('textbox', { name: '게시글 제목' });
		const error = screen.getByRole('alert');
		expect(titleField).toHaveAttribute('aria-invalid', 'true');
		expect(titleField).toHaveAttribute('aria-describedby', error.id);
	});
});
