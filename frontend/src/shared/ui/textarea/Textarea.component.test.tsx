import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import Textarea from './Textarea';

describe('Textarea', () => {
	it('native textarea 속성과 ref를 전달한다', async () => {
		const user = userEvent.setup();
		const textareaRef = createRef<HTMLTextAreaElement>();

		render(<Textarea ref={textareaRef} aria-label="소개" placeholder="소개를 입력해 주세요." rows={5} />);

		const textarea = screen.getByRole('textbox', { name: '소개' });
		expect(textareaRef.current).toBe(textarea);
		expect(textarea).toHaveAttribute('placeholder', '소개를 입력해 주세요.');
		expect(textarea).toHaveAttribute('rows', '5');

		await user.type(textarea, '기록을 작성하고 함께 나눠요.');
		expect(textarea).toHaveValue('기록을 작성하고 함께 나눠요.');
	});

	it('maxLength를 기준으로 현재 글자 수를 표시하고 입력을 제한한다', async () => {
		const user = userEvent.setup();
		const handleChange = vi.fn();
		function ControlledTextarea() {
			const [value, setValue] = useState('');

			return (
				<Textarea
					aria-label="소개"
					maxLength={5}
					value={value}
					onChange={(event) => {
						setValue(event.currentTarget.value);
						handleChange(event);
					}}
				/>
			);
		}

		render(<ControlledTextarea />);

		const textarea = screen.getByRole('textbox', { name: '소개' });
		expect(screen.getByText('0 / 5')).toBeVisible();

		await user.type(textarea, 'Rilog!');

		expect(textarea).toHaveValue('Rilog');
		expect(screen.getByText('5 / 5')).toBeVisible();
		expect(handleChange).toHaveBeenCalled();
	});

	it('error 상태에 접근 가능한 invalid 정보를 제공한다', () => {
		render(<Textarea aria-label="소개" status="error" maxLength={200} />);

		const textarea = screen.getByRole('textbox', { name: '소개' });
		expect(textarea).toHaveAttribute('aria-invalid', 'true');
		expect(textarea).toHaveAccessibleDescription('0 / 200');
	});

	it('명시적으로 전달한 aria-invalid 속성을 보존한다', () => {
		render(<Textarea aria-label="소개" status="success" aria-invalid="false" />);

		expect(screen.getByRole('textbox', { name: '소개' })).toHaveAttribute('aria-invalid', 'false');
	});

	it('controlled value가 변경되면 현재 글자 수를 갱신한다', () => {
		const { rerender } = render(<Textarea aria-label="소개" maxLength={10} value="기록" readOnly />);

		expect(screen.getByText('2 / 10')).toBeVisible();

		rerender(<Textarea aria-label="소개" maxLength={10} value="기록하기" readOnly />);

		expect(screen.getByText('4 / 10')).toBeVisible();
	});

	it('기존 설명과 글자 수를 함께 연결한다', () => {
		render(
			<>
				<p id="introduction-guide">공개 프로필에 표시되는 내용입니다.</p>
				<Textarea id="introduction" aria-label="소개" aria-describedby="introduction-guide" maxLength={200} />
			</>,
		);

		expect(screen.getByRole('textbox', { name: '소개' })).toHaveAccessibleDescription(
			'공개 프로필에 표시되는 내용입니다. 0 / 200',
		);
	});
});
