import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import { renderWithQuery as render } from '@/test/render-with-query';

import SignUpForm from './SignUpForm';

vi.mock('next/navigation', () => ({
	useRouter: () => ({ back: vi.fn(), replace: vi.fn() }),
}));

describe('SignUpForm', () => {
	const renderSignUpForm = (props: React.ComponentProps<typeof SignUpForm> = {}) => {
		return render(
			<AUTH_CONTEXT.Provider value={{ isAuthenticated: false, setIsAuthenticated: vi.fn(), logout: vi.fn() }}>
				<SignUpForm {...props} />
			</AUTH_CONTEXT.Provider>
		);
	};

	it('프로필 설정에 필요한 입력과 action을 제공한다', () => {
		renderSignUpForm();

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
		renderSignUpForm();

		const introduction = screen.getByRole('textbox', { name: '한 줄 소개' });
		await user.type(introduction, '함께 기록해요');

		expect(introduction).toHaveAccessibleDescription('나를 소개하는 문장을 입력하세요. 7 / 80');
	});

	it('선택한 프로필 이미지를 미리 보고 unmount 때 object URL을 해제한다', async () => {
		const createObjectUrl = vi.fn(() => 'blob:profile-image');
		const revokeObjectUrl = vi.fn();
		vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl }));
		const user = userEvent.setup();
		const { unmount } = renderSignUpForm();

		await user.upload(
			screen.getByLabelText('이미지 변경'),
			new File(['profile'], 'profile.png', { type: 'image/png' }),
		);

		expect(screen.getByRole('img', { name: '프로필 이미지 미리보기' })).toHaveAttribute('src', 'blob:profile-image');

		await user.click(screen.getByRole('button', { name: '기본 이미지로 변경' }));
		expect(screen.getByRole('img', { name: '프로필 이미지 미리보기' })).toHaveAttribute(
			'src',
			'/images/profile-placeholder.svg',
		);
		expect(screen.queryByRole('button', { name: '기본 이미지로 변경' })).not.toBeInTheDocument();

		unmount();
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:profile-image');
		vi.unstubAllGlobals();
	});

	it('이용약관 및 개인정보처리방침 동의를 선택할 수 있다', async () => {
		const user = userEvent.setup();
		renderSignUpForm();

		const agreement = screen.getByRole('checkbox', {
			name: '[필수] 아래 약관에 동의합니다.',
		});
		expect(agreement).toBeRequired();
		expect(agreement).toBeInvalid();
		await user.click(agreement);

		expect(agreement).toBeChecked();
		expect(agreement).toBeValid();
	});

	it('유효한 온보딩 정보를 제출하고 replace 옵션으로 이동한다', async () => {
		const user = userEvent.setup();
		const completeSignUp = vi.fn().mockResolvedValue({ slug: 'ri_log-01' });
		const navigate = vi.fn();
		renderSignUpForm({ completeSignUp, navigate });

		await user.type(screen.getByRole('textbox', { name: '닉네임' }), '리로그');
		await user.type(screen.getByRole('textbox', { name: '고유 아이디' }), 'Ri_log-01');
		await user.type(screen.getByRole('textbox', { name: '한 줄 소개' }), ' 함께 기록해요 ');
		await user.click(screen.getByRole('checkbox', { name: '[필수] 아래 약관에 동의합니다.' }));
		await user.click(screen.getByRole('button', { name: '시작하기' }));

		await waitFor(() => {
			expect(completeSignUp).toHaveBeenCalledWith({
				nickname: '리로그',
				slug: 'Ri_log-01',
				description: '함께 기록해요',
				profileImageFile: null,
			});
			expect(navigate).toHaveBeenCalledWith('/', { replace: true });
		});
	});

	it('고유 아이디에 허용되지 않은 특수문자가 있으면 제출하지 않는다', async () => {
		const user = userEvent.setup();
		const completeSignUp = vi.fn();
		renderSignUpForm({ completeSignUp, navigate: vi.fn() });

		await user.type(screen.getByRole('textbox', { name: '닉네임' }), '리로그');
		const slug = screen.getByRole('textbox', { name: '고유 아이디' });
		await user.type(slug, 'ri.log');
		await user.click(screen.getByRole('checkbox', { name: '[필수] 아래 약관에 동의합니다.' }));
		await user.click(screen.getByRole('button', { name: '시작하기' }));

		expect(slug).toBeInvalid();
		expect(completeSignUp).not.toHaveBeenCalled();
	});

	it('가입 실패 후 입력을 수정하면 이전 오류를 제거한다', async () => {
		const user = userEvent.setup();
		const completeSignUp = vi.fn().mockRejectedValue(new Error('이미 사용 중인 정보입니다.'));
		renderSignUpForm({ completeSignUp });

		const nickname = screen.getByRole('textbox', { name: '닉네임' });
		const slug = screen.getByRole('textbox', { name: '고유 아이디' });
		const agreement = screen.getByRole('checkbox', { name: '[필수] 아래 약관에 동의합니다.' });
		const submitButton = screen.getByRole('button', { name: '시작하기' });

		await user.type(nickname, '리로그');
		await user.type(slug, 'rilog');
		await user.click(agreement);
		await user.click(submitButton);
		expect(await screen.findByRole('alert')).toHaveTextContent('이미 사용 중인 정보입니다.');

		await user.type(nickname, '수정');
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();

		await user.click(submitButton);
		expect(await screen.findByRole('alert')).toBeInTheDocument();
		await user.type(slug, '2');
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();

		await user.click(submitButton);
		expect(await screen.findByRole('alert')).toBeInTheDocument();
		await user.click(agreement);
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();
	});
});
