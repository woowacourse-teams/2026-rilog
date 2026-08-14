import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import Checkbox from './Checkbox';

describe('Checkbox', () => {
	it('접근 가능한 이름과 native checkbox 속성, ref를 전달한다', () => {
		const checkboxRef = createRef<HTMLInputElement>();

		render(<Checkbox ref={checkboxRef} aria-label="이용약관 동의" name="agreement" value="accepted" required />);

		const checkbox = screen.getByRole('checkbox', { name: '이용약관 동의' });
		expect(checkboxRef.current).toBe(checkbox);
		expect(checkbox).toHaveAttribute('name', 'agreement');
		expect(checkbox).toHaveAttribute('value', 'accepted');
		expect(checkbox).toBeRequired();
	});

	it('label 클릭과 Space 키로 선택 상태를 변경한다', async () => {
		const user = userEvent.setup();
		render(
			<>
				<Checkbox id="agreement" />
				<label htmlFor="agreement">이용약관에 동의합니다.</label>
			</>,
		);

		const checkbox = screen.getByRole('checkbox', { name: '이용약관에 동의합니다.' });
		await user.tab();
		expect(checkbox).toHaveFocus();
		await user.keyboard(' ');
		expect(checkbox).toBeChecked();

		await user.click(screen.getByText('이용약관에 동의합니다.'));
		expect(checkbox).not.toBeChecked();
	});
});
