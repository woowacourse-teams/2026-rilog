import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { checkNicknameAvailability, checkSlugAvailability } from '@/shared/api/availability/api';
import { createColog } from '@/shared/api/cologs/api';
import type { CologCreateResponse } from '@/shared/api/cologs/types';
import type { ApiResponse } from '@/shared/api/shared.types';
import { uploadFileWithPresignedUrl } from '@/shared/api/uploads/api';
import type { PresignedUrlCreateResponse } from '@/shared/api/uploads/types';

import CologCreateForm from './CologCreateForm';

const { backMock, replaceMock } = vi.hoisted(() => ({ backMock: vi.fn(), replaceMock: vi.fn() }));

vi.mock('@/shared/api/cologs/api');
vi.mock('@/shared/api/availability/api');
vi.mock('@/shared/api/uploads/api');
vi.mock('next/navigation', () => ({
	useRouter: () => ({ back: backMock, replace: replaceMock }),
}));

const renderWithClient = (ui: React.ReactElement) => {
	const queryClient = new QueryClient({
		defaultOptions: {
			mutations: { retry: false },
		},
	});
	return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

const fillRequiredFields = async (
	user: ReturnType<typeof userEvent.setup>,
	{ shouldCheckAvailability = true }: { shouldCheckAvailability?: boolean } = {},
) => {
	const logoFile = new File(['logo'], 'logo.png', { type: 'image/png' });

	await user.upload(screen.getByLabelText('팀 로고 변경'), logoFile);
	await user.type(screen.getByRole('textbox', { name: '팀 이름' }), '  리로그  ');
	await user.type(screen.getByRole('textbox', { name: '팀 고유 아이디' }), '  rilog-team  ');
	await user.type(screen.getByRole('textbox', { name: '팀 소개' }), '함께 성장하는 개발 팀입니다');
	if (shouldCheckAvailability) {
		await user.click(screen.getByRole('button', { name: '팀 이름 중복 확인' }));
		await waitFor(() =>
			expect(screen.getByRole('textbox', { name: '팀 이름' })).toHaveAccessibleDescription(/사용가능/),
		);
		await user.click(screen.getByRole('button', { name: '팀 고유 아이디 중복 확인' }));
		await waitFor(() =>
			expect(screen.getByRole('textbox', { name: '팀 고유 아이디' })).toHaveAccessibleDescription(/사용가능/),
		);
	}

	return logoFile;
};

describe('CologCreateForm', () => {
	beforeEach(() => {
		backMock.mockClear();
		replaceMock.mockClear();
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

	it('팀 생성에 필요한 입력과 action을 제공한다', () => {
		renderWithClient(<CologCreateForm />);

		expect(screen.getByRole('img', { name: '팀 로고 미리보기' })).toBeInTheDocument();
		expect(screen.getByRole('img', { name: '기본 팀 커버 이미지' })).toBeInTheDocument();
		expect(screen.getByLabelText('팀 로고 변경')).toBeRequired();
		expect(screen.getByLabelText('커버 이미지 변경')).not.toBeRequired();
		for (const label of ['팀 로고', '팀 이름', '팀 고유 아이디']) {
			const fieldLabel = screen.getByText(label).closest('label')!;
			expect(within(fieldLabel).getByText('*')).toHaveClass('text-danger');
		}
		expect(screen.getByRole('textbox', { name: '팀 이름' })).toBeRequired();
		expect(screen.getByRole('button', { name: '팀 이름 중복 확인' })).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: '팀 고유 아이디' })).toBeRequired();
		expect(screen.getByRole('button', { name: '팀 고유 아이디 중복 확인' })).toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: '팀 소개' })).not.toBeRequired();
		expect(screen.getByRole('group', { name: '소셜' })).toHaveAccessibleDescription('링크를 통해 팀을 표현해 보세요.');
		expect(screen.queryByText('(선택)')).not.toBeInTheDocument();
		expect(screen.getByRole('textbox', { name: '팀 고유 아이디' }).parentElement).toHaveTextContent('rilog.kr/@');
		expect(screen.getByRole('textbox', { name: '서비스 링크' }).parentElement?.querySelector('img')).toHaveAttribute(
			'src',
			'/icons/form/link.svg',
		);
		expect(screen.getByRole('textbox', { name: 'GitHub 링크' }).parentElement?.querySelector('img')).toHaveAttribute(
			'src',
			'/icons/form/github.svg',
		);
		expect(screen.getByRole('textbox', { name: '서비스 링크' })).not.toBeRequired();
		expect(screen.getByRole('textbox', { name: 'GitHub 링크' })).not.toBeRequired();
		expect(screen.getByRole('button', { name: '취소' })).toHaveAttribute('type', 'button');
		expect(screen.getByRole('button', { name: '팀 만들기' })).toHaveAttribute('type', 'submit');
	});

	it('팀 고유 아이디를 정규화해 중복 확인하고 사용 가능 상태를 표시한다', async () => {
		const user = userEvent.setup();
		vi.mocked(checkSlugAvailability).mockResolvedValue({
			status: 200,
			message: '사용가능한 슬러그입니다.',
			data: null,
		});
		renderWithClient(<CologCreateForm />);

		const slug = screen.getByRole('textbox', { name: '팀 고유 아이디' });
		await user.type(slug, '  Rilog-Team  ');
		await user.click(screen.getByRole('button', { name: '팀 고유 아이디 중복 확인' }));

		await waitFor(() => expect(checkSlugAvailability).toHaveBeenCalledWith({ slug: 'rilog-team' }));
		expect(slug).toHaveValue('rilog-team');
		expect(slug).toHaveAccessibleDescription(/사용가능한 슬러그입니다\./);

		await user.type(slug, '2');
		expect(slug).not.toHaveAccessibleDescription(/사용가능한 슬러그입니다\./);
	});

	it('팀 이름을 정규화해 중복 확인하고 이름이 바뀌면 확인 상태를 초기화한다', async () => {
		const user = userEvent.setup();
		renderWithClient(<CologCreateForm />);

		const name = screen.getByRole('textbox', { name: '팀 이름' });
		await user.type(name, '  리로그 팀  ');
		await user.click(screen.getByRole('button', { name: '팀 이름 중복 확인' }));

		await waitFor(() => expect(checkNicknameAvailability).toHaveBeenCalledWith({ nickname: '리로그 팀' }));
		expect(name).toHaveValue('리로그 팀');
		expect(name).toHaveAccessibleDescription(/사용가능한 닉네임입니다\./);

		await user.type(name, '2');
		expect(name).not.toHaveAccessibleDescription(/사용가능한 닉네임입니다\./);
	});

	it('팀 이름 중복 확인 전 제출하면 이름 입력에 안내하고 focus한다', async () => {
		vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:logo'), revokeObjectURL: vi.fn() }));
		const user = userEvent.setup();
		const { unmount } = renderWithClient(<CologCreateForm />);

		await fillRequiredFields(user, { shouldCheckAvailability: false });
		await user.click(screen.getByRole('button', { name: '팀 고유 아이디 중복 확인' }));
		await user.click(screen.getByRole('button', { name: '팀 만들기' }));

		const name = screen.getByRole('textbox', { name: '팀 이름' });
		expect(createColog).not.toHaveBeenCalled();
		expect(name).toHaveAccessibleDescription(/팀 이름 중복 확인이 필요합니다\./);
		expect(name).toHaveFocus();

		unmount();
		vi.unstubAllGlobals();
	});

	it('중복된 팀 이름 오류를 입력 상태와 메시지로 표시한다', async () => {
		const user = userEvent.setup();
		vi.mocked(checkNicknameAvailability).mockRejectedValue({
			type: 'api',
			kind: 'conflict',
			detail: {
				status: 404,
				error: 'NOT_FOUND',
				errorCode: 'NICKNAME_DUPLICATED',
				message: '중복되는 닉네임입니다.',
				invalidParams: null,
			},
			response: new Response(null, { status: 404 }),
		});
		renderWithClient(<CologCreateForm />);

		const name = screen.getByRole('textbox', { name: '팀 이름' });
		await user.type(name, '리로그 팀');
		await user.click(screen.getByRole('button', { name: '팀 이름 중복 확인' }));

		await waitFor(() => expect(name).toBeInvalid());
		expect(name).toHaveAccessibleDescription(/중복되는 닉네임입니다\./);
	});

	it('중복 확인 전 제출하면 안내하고 확인 후 아이디가 바뀌면 다시 안내한다', async () => {
		vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:logo'), revokeObjectURL: vi.fn() }));
		const user = userEvent.setup();
		const { unmount } = renderWithClient(<CologCreateForm />);

		const submitButton = screen.getByRole('button', { name: '팀 만들기' });
		const slug = screen.getByRole('textbox', { name: '팀 고유 아이디' });

		await fillRequiredFields(user, { shouldCheckAvailability: false });
		await user.click(screen.getByRole('button', { name: '팀 이름 중복 확인' }));
		expect(submitButton).toBeEnabled();
		fireEvent.submit(submitButton.closest('form')!);
		expect(createColog).not.toHaveBeenCalled();
		expect(slug).toHaveAccessibleDescription(/팀 고유 아이디 중복 확인이 필요합니다\./);
		expect(slug).toHaveFocus();

		await user.click(screen.getByRole('button', { name: '팀 고유 아이디 중복 확인' }));
		await waitFor(() => expect(slug).toHaveAccessibleDescription(/사용가능한 슬러그입니다\./));

		await user.type(slug, '2');
		await user.click(submitButton);
		expect(slug).toHaveAccessibleDescription(/팀 고유 아이디 중복 확인이 필요합니다\./);

		unmount();
		vi.unstubAllGlobals();
	});

	it('유효하지 않은 팀 고유 아이디는 중복 확인 API를 호출하지 않고 오류를 안내한다', async () => {
		const user = userEvent.setup();
		renderWithClient(<CologCreateForm />);

		const slug = screen.getByRole('textbox', { name: '팀 고유 아이디' });
		await user.type(slug, 'rilog_team');
		await user.click(screen.getByRole('button', { name: '팀 고유 아이디 중복 확인' }));

		expect(checkSlugAvailability).not.toHaveBeenCalled();
		expect(slug).toBeInvalid();
		expect(slug).toHaveAccessibleDescription(
			/고유 아이디는 4~20자의 영문 소문자, 숫자와 하이픈\(-\)만 사용할 수 있어요\./,
		);
		expect(slug).toHaveFocus();
	});

	it('중복된 팀 고유 아이디 오류를 입력 상태와 메시지로 표시한다', async () => {
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
		renderWithClient(<CologCreateForm />);

		const slug = screen.getByRole('textbox', { name: '팀 고유 아이디' });
		await user.type(slug, 'rilog-team');
		await user.click(screen.getByRole('button', { name: '팀 고유 아이디 중복 확인' }));

		await waitFor(() => expect(slug).toBeInvalid());
		expect(slug).toHaveAccessibleDescription(/중복되는 슬러그입니다\./);
	});

	it('취소하면 브라우저의 이전 경로로 이동한다', async () => {
		const user = userEvent.setup();
		renderWithClient(<CologCreateForm />);

		await user.click(screen.getByRole('button', { name: '취소' }));

		expect(backMock).toHaveBeenCalledOnce();
	});

	it('로고를 등록하면 기본 이미지로 되돌릴 수 있고 클릭 시 초기화한다', async () => {
		const createObjectUrl = vi.fn(() => 'blob:logo');
		const revokeObjectUrl = vi.fn();
		vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl }));
		const user = userEvent.setup();
		const { unmount } = renderWithClient(<CologCreateForm />);

		await user.upload(screen.getByLabelText('팀 로고 변경'), new File(['logo'], 'logo.png', { type: 'image/png' }));

		expect(screen.getByRole('img', { name: '팀 로고 미리보기' })).toHaveAttribute('src', 'blob:logo');

		expect(screen.getByRole('img', { name: '팀 로고 미리보기' }).parentElement).toHaveClass('rounded-lg');
		await user.click(screen.getByRole('button', { name: '팀 로고 제거' }));
		expect(screen.getByRole('img', { name: '팀 로고 미리보기' })).toHaveAttribute(
			'src',
			'/images/profile-placeholder.svg',
		);

		unmount();
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:logo');
		vi.unstubAllGlobals();
	});

	it('팀 소개의 글자 수를 입력에 맞춰 안내한다', async () => {
		const user = userEvent.setup();
		renderWithClient(<CologCreateForm />);

		const introduction = screen.getByRole('textbox', { name: '팀 소개' });
		await user.type(introduction, '함께 성장하는 개발 팀입니다');

		expect(introduction).toHaveAccessibleDescription('팀을 소개하는 문장을 입력하세요. 15 / 80');
	});

	it('팀 이름과 고유 아이디의 입력 규칙을 제공한다', () => {
		renderWithClient(<CologCreateForm />);

		expect(screen.getByRole('textbox', { name: '팀 이름' })).toHaveAttribute('minlength', '2');
		expect(screen.getByRole('textbox', { name: '팀 이름' })).toHaveAttribute('maxlength', '20');
		expect(screen.getByRole('textbox', { name: '팀 고유 아이디' })).toHaveAttribute('pattern', '[a-z0-9-]+');
	});

	it('유효하지 않은 제출은 오류를 안내하고 첫 번째 오류 입력으로 focus한다', async () => {
		const user = userEvent.setup();

		renderWithClient(<CologCreateForm />);
		await user.click(screen.getByRole('button', { name: '팀 만들기' }));

		expect(screen.getByText('팀 로고를 등록해 주세요.')).toBeInTheDocument();
		expect(screen.getByText('팀 이름은 2~20자로 입력해 주세요.')).toBeInTheDocument();
		expect(screen.getByRole('img', { name: '팀 로고 미리보기' }).parentElement).toHaveClass('border-danger');
		expect(screen.getByLabelText('팀 로고 변경')).toHaveFocus();
		expect(createColog).not.toHaveBeenCalled();
	});

	it('입력을 정규화해 생성하고 생성된 팀 프로필로 이동한다', async () => {
		const createObjectUrl = vi.fn(() => 'blob:logo');
		const revokeObjectUrl = vi.fn();
		vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl }));
		const user = userEvent.setup();
		const navigate = vi.fn();
		vi.mocked(createColog).mockResolvedValue({
			status: 201,
			message: '',
			data: { id: 1, name: '리로그', slug: 'rilog-team' },
		});
		vi.mocked(uploadFileWithPresignedUrl).mockResolvedValue({
			uploadId: 'upload-1',
			objectKey: 'image.png',
			uploadUrl: 'https://uploads.rilog.test/image.png',
			headers: {},
			expiresAt: '2026-08-21T00:00:00Z',
		} satisfies PresignedUrlCreateResponse);
		const { unmount } = renderWithClient(<CologCreateForm navigate={navigate} />);
		await fillRequiredFields(user);

		await user.click(screen.getByRole('button', { name: '팀 만들기' }));

		await waitFor(() => expect(navigate).toHaveBeenCalledWith('/@rilog-team'));
		expect(createColog).toHaveBeenCalledWith(
			expect.objectContaining({
				name: '리로그',
				slug: 'rilog-team',
				introduction: '함께 성장하는 개발 팀입니다',
				serviceUrl: undefined,
				githubUrl: undefined,
				profileImageUrl: 'image.png',
			}),
		);

		unmount();
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:logo');
		vi.unstubAllGlobals();
	});

	it('생성 중 중복 제출을 막고 실패하면 입력을 유지한 채 재시도한다', async () => {
		const createObjectUrl = vi.fn(() => 'blob:logo');
		const revokeObjectUrl = vi.fn();
		vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl }));
		const user = userEvent.setup();
		const navigate = vi.fn();
		let rejectCreate: ((reason: Error) => void) | undefined;
		const firstAttempt = new Promise<ApiResponse<CologCreateResponse>>((_resolve, reject) => {
			rejectCreate = reject;
		});
		vi.mocked(createColog)
			.mockReturnValueOnce(firstAttempt)
			.mockResolvedValueOnce({ status: 201, message: '', data: { id: 1, name: '리로그', slug: 'rilog-team' } });
		const { unmount } = renderWithClient(<CologCreateForm navigate={navigate} />);
		await fillRequiredFields(user);

		await user.click(screen.getByRole('button', { name: '팀 만들기' }));

		expect(screen.getByRole('button', { name: '팀 만드는 중' })).toBeDisabled();
		expect(screen.getByRole('textbox', { name: '팀 이름' })).toBeDisabled();
		expect(createColog).toHaveBeenCalledOnce();

		rejectCreate?.(new Error('팀 생성에 실패했습니다.'));
		expect(await screen.findByRole('alert')).toHaveTextContent('팀 생성에 실패했습니다.');
		expect(screen.getByRole('textbox', { name: '팀 이름' })).toHaveValue('리로그');

		await user.click(screen.getByRole('button', { name: '팀 만들기' }));

		await waitFor(() => expect(navigate).toHaveBeenCalledWith('/@rilog-team'));
		expect(createColog).toHaveBeenCalledTimes(2);

		unmount();
		vi.unstubAllGlobals();
	});
});
