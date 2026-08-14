import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import SignUpForm from './SignUpForm';

describe('SignUpForm', () => {
	it('프로필 설정에 필요한 입력과 action을 제공한다', () => {
		render(<SignUpForm />);

		expect(screen.getByRole('img', { name: '프로필 이미지 미리보기' })).toBeInTheDocument();
		expect(screen.getByLabelText('이미지 변경')).toHaveAttribute('type', 'file');
		expect(screen.getByRole('textbox', { name: '닉네임' })).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: '고유 아이디' })).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: '한 줄 소개' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '시작하기' })).toBeInTheDocument();
	});

	it('한 줄 소개의 글자 수를 입력에 맞춰 안내한다', async () => {
		const user = userEvent.setup();
		render(<SignUpForm />);

		const introduction = screen.getByRole('textbox', { name: '한 줄 소개' });
		await user.type(introduction, '함께 기록해요');

		expect(introduction).toHaveAccessibleDescription('나를 소개하는 문장을 입력하세요. 7 / 80');
	});
});
