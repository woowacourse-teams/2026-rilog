import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreateColog } from '../model/colog-create';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createColog } from '@/shared/api/cologs/api';
import { uploadFileWithPresignedUrl } from '@/shared/api/uploads/api';
import CologCreateForm from './CologCreateForm';

const { backMock, replaceMock } = vi.hoisted(() => ({ backMock: vi.fn(), replaceMock: vi.fn() }));

vi.mock('@/shared/api/cologs/api');
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

const fillRequiredFields = async (user: ReturnType<typeof userEvent.setup>) => {
	const logoFile = new File(['logo'], 'logo.png', { type: 'image/png' });

	await user.upload(screen.getByLabelText('팀 로고 변경'), logoFile);
	await user.type(screen.getByRole('textbox', { name: '팀 이름' }), '  리로그  ');
	await user.type(screen.getByRole('textbox', { name: '팀 고유 아이디' }), '  rilog-team  ');
	await user.type(screen.getByRole('textbox', { name: '팀 소개 (선택)' }), '함께 성장하는 개발 팀입니다');

	return logoFile;
};

describe('CologCreateForm', () => {
	beforeEach(() => {
		backMock.mockClear();
		replaceMock.mockClear();
		vi.clearAllMocks();
	});

	it('팀 생성에 필요한 입력과 action을 제공한다', () => {
		renderWithClient(<CologCreateForm />);

		expect(screen.getByRole('img', { name: '팀 로고 미리보기' })).toBeInTheDocument();
		expect(screen.getByRole('img', { name: '팀 커버 이미지 미리보기' })).toBeInTheDocument();
		expect(screen.getByLabelText('팀 로고 변경')).toHaveAttribute('type', 'file');
		expect(screen.getByLabelText('팀 로고 변경')).toBeRequired();
		expect(screen.getByLabelText('커버 이미지 변경')).toHaveAttribute('type', 'file');
		expect(screen.getByLabelText('커버 이미지 변경')).not.toBeRequired();
		expect(screen.getByRole('textbox', { name: '팀 이름' })).toBeRequired();
		expect(screen.getByRole('textbox', { name: '팀 고유 아이디' })).toBeRequired();
		expect(screen.getByRole('textbox', { name: '팀 소개 (선택)' })).not.toBeRequired();
		expect(screen.getByRole('group', { name: '소셜 (선택)' })).toHaveAccessibleDescription(
			'링크를 통해 팀을 표현해 보세요.',
		);
		expect(screen.getByRole('textbox', { name: '서비스 링크' })).not.toBeRequired();
		expect(screen.getByRole('textbox', { name: 'GitHub 링크' })).not.toBeRequired();
		expect(screen.getByRole('button', { name: '취소' })).toHaveAttribute('type', 'button');
		expect(screen.getByRole('button', { name: '팀 만들기' })).toHaveAttribute('type', 'submit');
	});

	it('취소하면 브라우저의 이전 경로로 이동한다', async () => {
		const user = userEvent.setup();
		renderWithClient(<CologCreateForm />);

		await user.click(screen.getByRole('button', { name: '취소' }));

		expect(backMock).toHaveBeenCalledOnce();
	});

	it('로고를 등록하면 기본 이미지로 변경할 수 있는 버튼을 제공하고 클릭 시 초기화한다', async () => {
		const createObjectUrl = vi.fn(() => 'blob:logo');
		const revokeObjectUrl = vi.fn();
		vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl }));
		const user = userEvent.setup();
		const { unmount } = renderWithClient(<CologCreateForm />);

		expect(screen.queryByRole('button', { name: '기본 이미지로 변경' })).not.toBeInTheDocument();

		await user.upload(screen.getByLabelText('팀 로고 변경'), new File(['logo'], 'logo.png', { type: 'image/png' }));

		const resetButton = screen.getByRole('button', { name: '기본 이미지로 변경' });
		expect(resetButton).toBeInTheDocument();
		expect(screen.getByRole('img', { name: '팀 로고 미리보기' })).toHaveAttribute('src', 'blob:logo');

		await user.click(resetButton);
		expect(screen.getByRole('img', { name: '팀 로고 미리보기' })).toHaveAttribute(
			'src',
			'/images/profile-placeholder.svg',
		);
		expect(screen.queryByRole('button', { name: '기본 이미지로 변경' })).not.toBeInTheDocument();

		unmount();
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:logo');
		vi.unstubAllGlobals();
	});

	it('팀 소개의 글자 수를 입력에 맞춰 안내한다', async () => {
		const user = userEvent.setup();
		renderWithClient(<CologCreateForm />);

		const introduction = screen.getByRole('textbox', { name: '팀 소개 (선택)' });
		await user.type(introduction, '함께 성장하는 개발 팀입니다');

		expect(introduction).toHaveAccessibleDescription('팀을 소개해 보세요. 15 / 80');
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
		vi.mocked(createColog).mockResolvedValue({ status: 201, message: '', data: { id: 1, name: '리로그', slug: 'rilog-team' } });
		vi.mocked(uploadFileWithPresignedUrl).mockResolvedValue({ objectKey: 'image.png' } as any);
		const { unmount } = renderWithClient(<CologCreateForm navigate={navigate} />);
		const logoFile = await fillRequiredFields(user);

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
		const firstAttempt = new Promise<any>((_resolve, reject) => {
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
