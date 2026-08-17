import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import SignUpForm from './SignUpForm';

describe('SignUpForm', () => {
	it('프로필 설정에 필요한 입력과 action을 제공한다', () => {
		render(<SignUpForm />);

		expect(screen.getByRole('img', { name: '프로필 이미지 미리보기' })).toBeInTheDocument();
		expect(screen.getByLabelText('이미지 변경')).toHaveAttribute('type', 'file');
		expect(screen.getByRole('textbox', { name: '닉네임' })).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: '고유 아이디' })).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: '한 줄 소개' })).toBeInTheDocument();
		expect(
			screen.getByRole('checkbox', {
				name: '[필수] 아래 약관에 동의합니다.',
			}),
		).toHaveAccessibleDescription('이용약관 및 개인정보처리방침');
		expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '시작하기' })).toHaveAttribute('type', 'submit');

		expect(screen.getByRole('link', { name: '이용약관' })).toHaveAttribute(
			'href',
			'https://example.com/terms-of-service',
		);
		expect(screen.getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute(
			'href',
			'https://example.com/privacy-policy',
		);
		screen.getAllByRole('link').forEach((link) => {
			expect(link).toHaveAttribute('target', '_blank');
			expect(link).toHaveAttribute('rel', 'noopener noreferrer');
		});
	});

	it('한 줄 소개의 글자 수를 입력에 맞춰 안내한다', async () => {
		const user = userEvent.setup();
		render(<SignUpForm />);

		const introduction = screen.getByRole('textbox', { name: '한 줄 소개' });
		await user.type(introduction, '함께 기록해요');

		expect(introduction).toHaveAccessibleDescription('나를 소개하는 문장을 입력하세요. 7 / 80');
	});

	it('선택한 프로필 이미지를 미리 보고 unmount 때 object URL을 해제한다', async () => {
		const createObjectUrl = vi.fn(() => 'blob:profile-image');
		const revokeObjectUrl = vi.fn();
		vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl }));
		const user = userEvent.setup();
		const { unmount } = render(<SignUpForm />);

		await user.upload(
			screen.getByLabelText('이미지 변경'),
			new File(['profile'], 'profile.png', { type: 'image/png' }),
		);

		expect(screen.getByRole('img', { name: '프로필 이미지 미리보기' })).toHaveAttribute('src', 'blob:profile-image');
		unmount();
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:profile-image');
		vi.unstubAllGlobals();
	});

	it('이용약관 및 개인정보처리방침 동의를 선택할 수 있다', async () => {
		const user = userEvent.setup();
		render(<SignUpForm />);

		const agreement = screen.getByRole('checkbox', {
			name: '[필수] 아래 약관에 동의합니다.',
		});
		expect(agreement).toBeRequired();
		expect(agreement).toBeInvalid();
		await user.click(agreement);

		expect(agreement).toBeChecked();
		expect(agreement).toBeValid();
	});
});
