import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import { checkNicknameAvailability, checkSlugAvailability } from '@/shared/api/availability/api';
import { MAX_IMAGE_FILE_SIZE_BYTES } from '@/shared/constants/image-upload';
import { renderWithQuery as render } from '@/test/render-with-query';

import { hasActiveSignUpFlow, startSignUpFlow } from '../lib/sign-up-flow-session';

import SignUpForm from './SignUpForm';

const { signUpCompletedMock } = vi.hoisted(() => ({ signUpCompletedMock: vi.fn() }));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ back: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/shared/api/availability/api', () => ({
	checkNicknameAvailability: vi.fn(),
	checkSlugAvailability: vi.fn(),
}));

vi.mock('@/features/analytics/model/events', () => ({ analytics: { signUpCompleted: signUpCompletedMock } }));

describe('SignUpForm', () => {
	beforeEach(() => {
		sessionStorage.clear();
		vi.clearAllMocks();
		vi.mocked(checkNicknameAvailability).mockResolvedValue({
			status: 200,
			message: '사용가능한 닉네임입니다.',
			data: null,
		});
		vi.mocked(checkSlugAvailability).mockResolvedValue({
			status: 200,
			message: '사용가능한 슬러그입니다.',
			data: null,
		});
	});

	const renderSignUpForm = (props: React.ComponentProps<typeof SignUpForm> = {}) => {
		return render(
			<AUTH_CONTEXT.Provider value={{ isAuthenticated: false, isInitialized: true }}>
				<SignUpForm {...props} />
			</AUTH_CONTEXT.Provider>,
		);
	};

	it('프로필 설정에 필요한 입력과 action을 제공한다', () => {
		renderSignUpForm();

		expect(screen.getByRole('img', { name: '프로필 이미지 미리보기' })).toBeInTheDocument();
		expect(screen.getByText('프로필 이미지 추가')).toBeInTheDocument();
		expect(screen.getByLabelText('프로필 이미지 추가')).toHaveAccessibleDescription(
			'프로필 이미지는 360*360px(1:1) 사이즈를 권장해요. 10MB 이하의 파일만 업로드 가능해요.',
		);
		expect(screen.getByRole('textbox', { name: '닉네임' })).toBeInTheDocument();
		const slugInput = screen.getByRole('textbox', { name: '고유 아이디' });
		expect(slugInput).toBeInTheDocument();
		expect(slugInput).toHaveAccessibleDescription(
			'아이디는 4~20자 사이로 입력 가능해요. 영어와 숫자, 허용된 특수기호(-/_)만 사용 가능해요. 아이디는 한 번 설정하면 변경할 수 없습니다.',
		);
		expect(screen.getByRole('button', { name: '닉네임 중복 확인' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '고유 아이디 중복 확인' })).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: '한 줄 소개' })).toBeInTheDocument();
		expect(
			screen.getByRole('checkbox', {
				name: '[필수] 아래 약관에 동의합니다.',
			}),
		).toHaveAccessibleDescription('이용약관 및 개인정보처리방침');
		expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
		expect(screen.getByRole('button', { name: '시작하기' })).toHaveAttribute('type', 'submit');
		expect(screen.getByRole('button', { name: '시작하기' })).toBeDisabled();

		expect(screen.getByRole('link', { name: '이용약관' })).toHaveAttribute(
			'href',
			'https://receptive-sugar-20f.notion.site/Rilog-3c20af5ece568021b809fedd5650c5dd?source=copy_link',
		);
		expect(screen.getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute(
			'href',
			'https://receptive-sugar-20f.notion.site/Rilog-3c20af5ece568068a244ead52491639b?source=copy_link',
		);
		screen.getAllByRole('link').forEach((link) => {
			expect(link).toHaveAttribute('target', '_blank');
			expect(link).toHaveAttribute('rel', 'noopener noreferrer');
		});
	});

	it('닉네임과 고유 아이디 중복 확인을 요청하고 사용 가능 상태를 표시한다', async () => {
		const user = userEvent.setup();
		vi.mocked(checkNicknameAvailability).mockResolvedValue({
			status: 200,
			message: '사용가능한 닉네임입니다.',
			data: null,
		});
		vi.mocked(checkSlugAvailability).mockResolvedValue({
			status: 200,
			message: '사용가능한 슬러그입니다.',
			data: null,
		});
		renderSignUpForm();

		const nickname = screen.getByRole('textbox', { name: '닉네임' });
		const slug = screen.getByRole('textbox', { name: '고유 아이디' });
		await user.type(nickname, '리로그');
		await user.type(slug, 'rilog');
		await user.click(screen.getByRole('button', { name: '닉네임 중복 확인' }));
		await user.click(screen.getByRole('button', { name: '고유 아이디 중복 확인' }));

		await waitFor(() => {
			expect(checkNicknameAvailability).toHaveBeenCalledWith({ nickname: '리로그' });
			expect(checkSlugAvailability).toHaveBeenCalledWith({ slug: 'rilog' });
		});
		expect(nickname).toHaveAccessibleDescription(/사용가능한 닉네임입니다\./);
		expect(slug).toHaveAccessibleDescription(/사용가능한 슬러그입니다\./);

		await user.type(nickname, '팀');
		expect(nickname).not.toHaveAccessibleDescription(/사용가능한 닉네임입니다\./);
	});

	it('중복 확인 전 제출하면 안내하고 두 확인 후 입력이 바뀌면 다시 안내한다', async () => {
		const user = userEvent.setup();
		const completeSignUp = vi.fn();
		vi.mocked(checkNicknameAvailability).mockResolvedValue({
			status: 200,
			message: '사용가능한 닉네임입니다.',
			data: null,
		});
		vi.mocked(checkSlugAvailability).mockResolvedValue({
			status: 200,
			message: '사용가능한 슬러그입니다.',
			data: null,
		});
		renderSignUpForm({ completeSignUp });

		const nickname = screen.getByRole('textbox', { name: '닉네임' });
		const slug = screen.getByRole('textbox', { name: '고유 아이디' });
		const submitButton = screen.getByRole('button', { name: '시작하기' });

		await user.type(nickname, '리로그');
		await user.type(slug, 'rilog');
		await user.click(screen.getByRole('checkbox', { name: '[필수] 아래 약관에 동의합니다.' }));

		expect(submitButton).toBeEnabled();
		fireEvent.submit(submitButton.closest('form')!);
		expect(completeSignUp).not.toHaveBeenCalled();
		expect(nickname).toHaveAccessibleDescription(/닉네임 중복 확인이 필요합니다\./);
		expect(slug).toHaveAccessibleDescription(/고유 아이디 중복 확인이 필요합니다\./);
		expect(nickname).toHaveFocus();

		await user.click(screen.getByRole('button', { name: '닉네임 중복 확인' }));
		await waitFor(() => expect(nickname).toHaveAccessibleDescription(/사용가능한 닉네임입니다\./));

		await user.click(screen.getByRole('button', { name: '고유 아이디 중복 확인' }));
		await waitFor(() => expect(slug).toHaveAccessibleDescription(/사용가능한 슬러그입니다\./));

		await user.type(nickname, '팀');
		await user.click(submitButton);
		expect(nickname).toHaveAccessibleDescription(/닉네임 중복 확인이 필요합니다\./);
	});

	it('중복 확인 중인 입력과 버튼을 비활성화한다', async () => {
		const user = userEvent.setup();
		let resolveAvailabilityCheck: (() => void) | undefined;
		vi.mocked(checkNicknameAvailability).mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveAvailabilityCheck = () => resolve({ status: 200, message: '사용가능한 닉네임입니다.', data: null });
				}),
		);
		renderSignUpForm();

		const nickname = screen.getByRole('textbox', { name: '닉네임' });
		const checkButton = screen.getByRole('button', { name: '닉네임 중복 확인' });
		await user.type(nickname, '리로그');
		await user.click(checkButton);

		expect(nickname).toBeDisabled();
		expect(checkButton).toBeDisabled();
		expect(checkButton).toHaveAttribute('aria-busy', 'true');

		resolveAvailabilityCheck?.();
		await waitFor(() => expect(checkButton).toBeEnabled());
	});

	it('유효하지 않은 입력은 중복 확인 API를 호출하지 않고 입력 오류를 안내한다', async () => {
		const user = userEvent.setup();
		renderSignUpForm();

		const nickname = screen.getByRole('textbox', { name: '닉네임' });
		const slug = screen.getByRole('textbox', { name: '고유 아이디' });
		await user.type(nickname, '  ');
		await user.click(screen.getByRole('button', { name: '닉네임 중복 확인' }));

		expect(checkNicknameAvailability).not.toHaveBeenCalled();
		expect(nickname).toBeInvalid();
		expect(nickname).toHaveAccessibleDescription(/닉네임은 2~20자로 입력해 주세요\./);
		expect(nickname).toHaveFocus();

		await user.type(slug, 'ri.log');
		await user.click(screen.getByRole('button', { name: '고유 아이디 중복 확인' }));

		expect(checkSlugAvailability).not.toHaveBeenCalled();
		expect(slug).toBeInvalid();
		expect(slug).toHaveAccessibleDescription(
			/고유 아이디는 4~20자의 영문, 숫자, 하이픈\(-\), 언더스코어\(_\)만 사용할 수 있어요\./,
		);
		expect(slug).toHaveFocus();
	});

	it('중복된 고유 아이디 오류를 입력 상태와 메시지로 표시한다', async () => {
		const user = userEvent.setup();
		vi.mocked(checkSlugAvailability).mockRejectedValue({
			type: 'api',
			kind: 'conflict',
			detail: {
				status: 404,
				error: 'NOT_FOUND',
				errorCode: 'SLUG_DUPLICATED',
				message: '중복되는 슬러그입니다.',
				invalidParams: null,
			},
			response: new Response(null, { status: 404 }),
		});
		renderSignUpForm();

		const slug = screen.getByRole('textbox', { name: '고유 아이디' });
		await user.type(slug, 'rilog');
		await user.click(screen.getByRole('button', { name: '고유 아이디 중복 확인' }));

		await waitFor(() => expect(slug).toBeInvalid());
		expect(slug).toHaveAccessibleDescription(/중복되는 슬러그입니다\./);
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
			screen.getByLabelText('프로필 이미지 추가'),
			new File(['profile'], 'profile.png', { type: 'image/png' }),
		);

		expect(screen.getByRole('img', { name: '프로필 이미지 미리보기' })).toHaveAttribute('src', 'blob:profile-image');

		expect(screen.getByText('프로필 이미지 변경')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: '프로필 이미지 기본 이미지로 되돌리기' }));
		expect(screen.getByRole('img', { name: '프로필 이미지 미리보기' })).toHaveAttribute(
			'src',
			'/images/profile-placeholder.svg',
		);
		expect(screen.queryByRole('button', { name: '프로필 이미지 기본 이미지로 되돌리기' })).not.toBeInTheDocument();

		unmount();
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:profile-image');
		vi.unstubAllGlobals();
	});

	it('10MB를 초과한 프로필 이미지는 반영하지 않고 이미지 영역 아래에 오류를 안내한다', async () => {
		vi.stubGlobal(
			'URL',
			Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:profile-image'), revokeObjectURL: vi.fn() }),
		);
		const user = userEvent.setup();
		const oversizedImage = new File([new Uint8Array(MAX_IMAGE_FILE_SIZE_BYTES + 1)], 'oversized.png', {
			type: 'image/png',
		});
		const validImage = new File(['valid'], 'valid.png', { type: 'image/png' });
		const { unmount } = renderSignUpForm();
		const imageInput = screen.getByLabelText('프로필 이미지 추가');

		await user.upload(imageInput, oversizedImage);

		expect((imageInput as HTMLInputElement).files).toHaveLength(0);
		expect(imageInput).toHaveAttribute('aria-invalid', 'true');
		expect(imageInput).toHaveAccessibleDescription(/프로필 이미지는 10MB 이하의 이미지만 업로드할 수 있어요\./);
		const imageError = screen.getByText('프로필 이미지는 10MB 이하의 이미지만 업로드할 수 있어요.');
		expect(imageError.previousElementSibling).toContainElement(
			screen.getByRole('img', { name: '프로필 이미지 미리보기' }),
		);
		expect(imageError.previousElementSibling).toContainElement(imageInput);

		await user.upload(imageInput, validImage);

		expect(imageInput).toHaveAttribute('aria-invalid', 'false');
		expect(screen.queryByText('프로필 이미지는 10MB 이하의 이미지만 업로드할 수 있어요.')).not.toBeInTheDocument();

		unmount();
		vi.unstubAllGlobals();
	});

	it('이용약관 및 개인정보처리방침 동의를 선택할 수 있다', async () => {
		const user = userEvent.setup();
		renderSignUpForm();

		const agreement = screen.getByRole('checkbox', {
			name: '[필수] 아래 약관에 동의합니다.',
		});
		const submitButton = screen.getByRole('button', { name: '시작하기' });
		expect(agreement).toBeRequired();
		expect(agreement).toBeInvalid();
		expect(submitButton).toBeDisabled();
		await user.click(agreement);

		expect(agreement).toBeChecked();
		expect(agreement).toBeValid();
		expect(submitButton).toBeEnabled();

		await user.click(agreement);
		expect(submitButton).toBeDisabled();
	});

	it('유효한 온보딩 정보를 제출하고 replace 옵션으로 이동한다', async () => {
		const user = userEvent.setup();
		const completeSignUp = vi.fn().mockResolvedValue({ slug: 'ri_log-01' });
		const navigate = vi.fn();
		startSignUpFlow();
		renderSignUpForm({ completeSignUp, navigate });

		await user.type(screen.getByRole('textbox', { name: '닉네임' }), '리로그');
		await user.type(screen.getByRole('textbox', { name: '고유 아이디' }), 'Ri_log-01');
		await user.type(screen.getByRole('textbox', { name: '한 줄 소개' }), ' 함께 기록해요 ');
		await user.click(screen.getByRole('button', { name: '닉네임 중복 확인' }));
		await user.click(screen.getByRole('button', { name: '고유 아이디 중복 확인' }));
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
		expect(hasActiveSignUpFlow()).toBe(false);
		expect(signUpCompletedMock).toHaveBeenCalledWith({
			hasProfileImage: false,
			hasIntroduction: true,
		});
	});

	it('취소하면 회원가입 흐름을 제거하고 이전 페이지로 이동한다', async () => {
		const user = userEvent.setup();
		const historyBack = vi.spyOn(window.history, 'back').mockImplementation(() => undefined);
		startSignUpFlow();
		renderSignUpForm();

		await user.click(screen.getByRole('button', { name: '취소' }));

		expect(hasActiveSignUpFlow()).toBe(false);
		expect(historyBack).toHaveBeenCalledOnce();
		historyBack.mockRestore();
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
		await user.click(screen.getByRole('button', { name: '닉네임 중복 확인' }));
		await user.click(screen.getByRole('button', { name: '고유 아이디 중복 확인' }));
		await user.click(agreement);
		await user.click(submitButton);
		expect(await screen.findByRole('alert')).toHaveTextContent('이미 사용 중인 정보입니다.');

		await user.type(nickname, '수정');
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();

		await user.click(submitButton);
		expect(nickname).toHaveAccessibleDescription(/닉네임 중복 확인이 필요합니다\./);
		expect(completeSignUp).toHaveBeenCalledOnce();

		await user.click(screen.getByRole('button', { name: '닉네임 중복 확인' }));
		await user.click(submitButton);
		expect(await screen.findByRole('alert')).toBeInTheDocument();

		await user.type(slug, '2');
		expect(screen.queryByRole('alert')).not.toBeInTheDocument();

		await user.click(submitButton);
		expect(slug).toHaveAccessibleDescription(/고유 아이디 중복 확인이 필요합니다\./);
		expect(completeSignUp).toHaveBeenCalledTimes(2);
	});
});
