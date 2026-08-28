import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import Input from './Input';

describe('Input', () => {
	it('native input 속성과 ref를 전달한다', async () => {
		const user = userEvent.setup();
		const inputRef = createRef<HTMLInputElement>();

		render(<Input ref={inputRef} aria-label="닉네임" placeholder="예: 리로그" />);

		const input = screen.getByRole('textbox', { name: '닉네임' });
		expect(inputRef.current).toBe(input);
		expect(input).toHaveAttribute('placeholder', '예: 리로그');

		await user.type(input, '릴로그');
		expect(input).toHaveValue('릴로그');
	});

	it('error 상태에 접근 가능한 invalid 정보를 제공한다', () => {
		render(<Input aria-label="닉네임" status="error" helperText="사용할 수 없는 닉네임입니다." />);

		const input = screen.getByRole('textbox', { name: '닉네임' });
		const helperText = screen.getByText('사용할 수 없는 닉네임입니다.');

		expect(input).toHaveAttribute('aria-invalid', 'true');
		expect(input).toHaveAccessibleDescription('사용할 수 없는 닉네임입니다.');
		expect(helperText).toBeVisible();
	});

	it('명시적으로 전달한 aria-invalid 속성을 보존한다', () => {
		render(<Input aria-label="고유 아이디" status="success" aria-invalid="false" />);

		expect(screen.getByRole('textbox', { name: '고유 아이디' })).toHaveAttribute('aria-invalid', 'false');
	});

	it('기존 설명과 helper text를 함께 연결한다', () => {
		render(
			<>
				<p id="nickname-guide">닉네임은 2~20자 사이로 입력 가능해요.</p>
				<Input
					id="nickname"
					aria-label="닉네임"
					aria-describedby="nickname-guide"
					helperText="사용할 닉네임을 입력해 주세요."
				/>
			</>,
		);

		expect(screen.getByRole('textbox', { name: '닉네임' })).toHaveAccessibleDescription(
			'닉네임은 2~20자 사이로 입력 가능해요. 사용할 닉네임을 입력해 주세요.',
		);
	});
});
