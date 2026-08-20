import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Block } from '@blocknote/core';

import type { PostEditorProps } from '@/features/post-write/model/post-editor';
import type { PublishPost } from '@/features/post-write/model/post-publication';

import PostWriteWorkspace from './PostWriteWorkspace';

const { replaceMock, uploadRepresentativeImageMock, requestPostPublicationMock } = vi.hoisted(() => ({
	replaceMock: vi.fn(),
	uploadRepresentativeImageMock: vi.fn(),
	requestPostPublicationMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), replace: replaceMock }),
}));

vi.mock('@/shared/api/users/queries/my-info/use-query', () => ({
	useMyInfoQuery: () => ({
		data: {
			status: 200,
			message: 'OK',
			data: { id: 10, slug: 'jetproc', nickname: '제트', profileImageUrl: 'profile/object-key.png' },
		},
	}),
}));

vi.mock('@/shared/api/users/queries/my-cologs-preview/use-query', () => ({
	useMyCologsPreviewQuery: () => ({
		data: {
			status: 200,
			message: 'OK',
			data: [{ cologId: 20, slug: 'rilog-team', name: 'Rilog Team' }],
		},
	}),
}));

vi.mock('@/shared/api/uploads/mutations/use-upload-file-mutation', () => ({
	useUploadFileMutation: () => ({ mutateAsync: uploadRepresentativeImageMock }),
}));

vi.mock('@/shared/api/blogs/mutations/use-publish-post-mutation', () => ({
	usePublishPostMutation: () => ({ mutateAsync: requestPostPublicationMock }),
}));

beforeEach(() => {
	replaceMock.mockReset();
	uploadRepresentativeImageMock.mockReset();
	requestPostPublicationMock.mockReset();
	uploadRepresentativeImageMock.mockResolvedValue({ objectKey: 'posts/cover-object-key.png' });
	requestPostPublicationMock.mockResolvedValue({
		status: 201,
		message: '게시글 발행에 성공했습니다.',
		data: { postId: 77, slug: 'jetproc' },
	});
});

afterEach(() => {
	vi.unstubAllEnvs();
});

const createParagraph = (text = ''): Block => ({
	id: 'paragraph',
	type: 'paragraph',
	props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
	content: text.length > 0 ? [{ type: 'text', text, styles: {} }] : [],
	children: [],
});

function FakeEditor({ onChange, onReady, ariaDescribedBy, ref }: PostEditorProps) {
	// BlockNote를 로드하지 않고도 부모와 주고받는 최신 본문 계약을 재현
	const blocksRef = useRef<Block[]>([createParagraph()]);
	// focus 위임 여부를 실제 textarea focus로 검증하기 위한 ref
	const editorRef = useRef<HTMLTextAreaElement>(null);

	useImperativeHandle(ref, () => ({
		focus: () => editorRef.current?.focus(),
	}));

	useEffect(() => {
		onReady(blocksRef.current);
	}, [onReady]);

	return (
		<textarea
			ref={editorRef}
			aria-label="게시글 내용"
			aria-describedby={ariaDescribedBy}
			onChange={(event) => {
				blocksRef.current = [createParagraph(event.currentTarget.value)];
				onChange(blocksRef.current);
			}}
		/>
	);
}

function BodyImageUploadEditor({ onReady, uploadFile }: PostEditorProps) {
	const [uploadedImageUrl, setUploadedImageUrl] = useState('');

	useEffect(() => {
		onReady([createParagraph('이미지 본문')]);
	}, [onReady]);

	return (
		<>
			<button
				type="button"
				onClick={() => {
					void uploadFile(new File(['body-image'], 'body.png', { type: 'image/png' })).then(setUploadedImageUrl);
				}}
			>
				본문 이미지 업로드
			</button>
			<output>{uploadedImageUrl}</output>
		</>
	);
}

const fillValidPost = async (user: ReturnType<typeof userEvent.setup>) => {
	await user.type(screen.getByRole('textbox', { name: '게시글 제목' }), 'BlockNote 도입기');
	await user.type(screen.getByRole('textbox', { name: '게시글 내용' }), '오늘 배운 내용을 기록합니다.');
};

// 여러 발행 시나리오에서 반복되는 필수 Co-log 선택 동작
const selectFirstCoLog = async (user: ReturnType<typeof userEvent.setup>) => {
	const select = screen.getByRole('combobox', { name: 'Co-log' });
	const firstCoLogOption = screen.getAllByRole('option')[1];
	await user.selectOptions(select, firstCoLogOption);
	return firstCoLogOption.getAttribute('value')!;
};

describe('PostWriteWorkspace', () => {
	it('진입 시 제목에 focus하고 Enter를 누르면 본문으로 이동한다', async () => {
		const user = userEvent.setup();
		render(<PostWriteWorkspace editorComponent={FakeEditor} />);

		const titleField = screen.getByRole('textbox', { name: '게시글 제목' });
		expect(titleField).toHaveFocus();
		await user.type(titleField, '제목{enter}');
		expect(screen.getByRole('textbox', { name: '게시글 내용' })).toHaveFocus();
	});

	it('빈 문서는 설정 모달을 열지 않고 첫 오류로 focus한다', async () => {
		const user = userEvent.setup();
		render(<PostWriteWorkspace editorComponent={FakeEditor} />);

		await user.click(screen.getByRole('button', { name: '발행' }));

		expect(screen.queryByRole('dialog', { name: '게시 설정' })).not.toBeInTheDocument();
		expect(screen.getByText('제목을 입력해 주세요.')).toBeInTheDocument();
		const bodyError = screen.getByText('내용을 입력해 주세요.');
		const bodyField = screen.getByRole('textbox', { name: '게시글 내용' });
		expect(bodyField).toHaveAttribute('aria-describedby', bodyError.id);
		expect(screen.getByRole('textbox', { name: '게시글 제목' })).toHaveFocus();

		await user.type(bodyField, '본문');
		expect(bodyField).not.toHaveAttribute('aria-describedby');
	});

	it('내 블로그와 소속 팀 블로그를 발행 대상으로 보여 준다', async () => {
		const user = userEvent.setup();
		render(<PostWriteWorkspace editorComponent={FakeEditor} />);

		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '발행' }));

		expect(screen.getByRole('option', { name: '내 블로그' })).toHaveValue('10');
		expect(screen.getByRole('option', { name: 'Rilog Team' })).toHaveValue('20');
	});

	it('본문 이미지를 스토리지에 업로드하고 완성된 URL을 에디터에 전달한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_S3_BUCKET_URL', 'https://images.rilog.test');
		uploadRepresentativeImageMock.mockResolvedValue({ objectKey: 'posts/body-image.png' });
		const user = userEvent.setup();
		render(<PostWriteWorkspace editorComponent={BodyImageUploadEditor} />);

		await user.click(screen.getByRole('button', { name: '본문 이미지 업로드' }));

		expect(await screen.findByText('https://images.rilog.test/posts/body-image.png')).toBeInTheDocument();
		expect(uploadRepresentativeImageMock).toHaveBeenCalledWith({
			file: expect.objectContaining({ name: 'body.png', type: 'image/png' }),
			type: 'IMAGE',
		});
	});

	it('모달을 닫았다 열어도 게시 설정을 유지하고 backdrop으로 닫히지 않는다', async () => {
		const user = userEvent.setup();
		render(<PostWriteWorkspace editorComponent={FakeEditor} />);
		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '발행' }));

		const dialog = screen.getByRole('dialog', { name: '게시 설정' });
		expect(screen.queryByRole('button', { name: '모달 닫기' })).not.toBeInTheDocument();
		fireEvent.click(dialog);
		expect(dialog).toBeInTheDocument();

		await user.click(screen.getByRole('radio', { name: '일상' }));
		const selectedCoLogId = await selectFirstCoLog(user);
		await user.click(screen.getByRole('button', { name: '취소' }));
		await waitFor(() => expect(screen.queryByRole('dialog', { name: '게시 설정' })).not.toBeInTheDocument());
		await user.click(screen.getByRole('button', { name: '발행' }));

		expect(screen.getByRole('radio', { name: '일상' })).toBeChecked();
		expect(screen.getByRole('combobox', { name: 'Co-log' })).toHaveValue(selectedCoLogId);
	});

	it('선택한 대표 이미지를 유지하고 교체·제거·unmount 때 object URL을 해제한다', async () => {
		const createObjectUrl = vi.fn().mockReturnValueOnce('blob:first-cover').mockReturnValueOnce('blob:second-cover');
		const revokeObjectUrl = vi.fn();
		vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl }));
		const user = userEvent.setup();
		const { unmount } = render(<PostWriteWorkspace editorComponent={FakeEditor} />);
		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '발행' }));

		const thumbnailPreview = screen.getByRole('figure', { name: '게시글 썸네일 미리보기' });
		expect(within(thumbnailPreview).getByText('BlockNote 도입기')).toBeInTheDocument();
		await user.upload(screen.getByLabelText('이미지 선택'), new File(['first'], 'first.png', { type: 'image/png' }));
		expect(screen.getByRole('img', { name: '게시글 대표 이미지 미리보기' })).toHaveAttribute('src', 'blob:first-cover');

		await user.upload(screen.getByLabelText('이미지 변경'), new File(['second'], 'second.png', { type: 'image/png' }));
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:first-cover');
		await user.click(screen.getByRole('button', { name: '취소' }));
		await waitFor(() => expect(screen.queryByRole('dialog', { name: '게시 설정' })).not.toBeInTheDocument());
		await user.click(screen.getByRole('button', { name: '발행' }));
		expect(screen.getByRole('img', { name: '게시글 대표 이미지 미리보기' })).toHaveAttribute(
			'src',
			'blob:second-cover',
		);

		unmount();
		expect(revokeObjectUrl).toHaveBeenCalledWith('blob:second-cover');
		vi.unstubAllGlobals();
	});

	it('발행 중 중복 제출과 dismiss를 막고 성공한 상세 URL로 이동한다', async () => {
		const user = userEvent.setup();
		const historyBackSpy = vi.spyOn(window.history, 'back');
		historyBackSpy.mockClear();
		replaceMock.mockClear();
		let resolvePublish: ((value: { postId: string; slug: string }) => void) | undefined;
		const publishPost: PublishPost = vi.fn(
			() =>
				new Promise<{ postId: string; slug: string }>((resolve) => {
					resolvePublish = resolve;
				}),
		);
		render(<PostWriteWorkspace editorComponent={FakeEditor} publishPost={publishPost} />);
		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '발행' }));
		await selectFirstCoLog(user);
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		const dialog = screen.getByRole('dialog', { name: '게시 설정' });
		expect(screen.getByRole('button', { name: '취소' })).toBeDisabled();
		expect(screen.getAllByRole('button', { name: '발행' }).at(-1)).toBeDisabled();
		fireEvent.click(dialog);
		fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
		expect(dialog).toBeInTheDocument();
		expect(publishPost).toHaveBeenCalledOnce();

		resolvePublish?.({ postId: 'post/40', slug: 'rilog' });
		await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/@rilog/posts/post%2F40'));
		expect(historyBackSpy).not.toHaveBeenCalled();
		historyBackSpy.mockRestore();
	});

	it('발행 결과의 게시글 ID가 잘못되면 모달과 이탈 보호를 유지한다', async () => {
		const user = userEvent.setup();
		const navigate = vi.fn();
		const publishPost = vi.fn<PublishPost>().mockResolvedValue({ postId: '   ', slug: 'rilog' });
		render(<PostWriteWorkspace editorComponent={FakeEditor} publishPost={publishPost} navigate={navigate} />);
		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '발행' }));
		await selectFirstCoLog(user);
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		const dialog = screen.getByRole('dialog', { name: '게시 설정' });
		expect(await within(dialog).findByText('게시글 ID가 필요합니다.')).toBeInTheDocument();
		expect(navigate).not.toHaveBeenCalled();

		const beforeUnloadEvent = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(beforeUnloadEvent);
		expect(beforeUnloadEvent.defaultPrevented).toBe(true);
	});

	it('발행 실패 후 입력과 설정을 유지한 채 재시도한다', async () => {
		const user = userEvent.setup();
		const navigate = vi.fn();
		const publishPost: PublishPost = vi
			.fn<PublishPost>()
			.mockRejectedValueOnce(new Error('failed'))
			.mockResolvedValueOnce({ postId: 'retry-success', slug: 'rilog' });
		render(<PostWriteWorkspace editorComponent={FakeEditor} publishPost={publishPost} navigate={navigate} />);
		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '발행' }));
		const selectedCoLogId = await selectFirstCoLog(user);
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		expect(await screen.findByText('failed')).toBeInTheDocument();
		expect(screen.getByRole('combobox', { name: 'Co-log' })).toHaveValue(selectedCoLogId);
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		await waitFor(() => expect(navigate).toHaveBeenCalledWith('/@rilog/posts/retry-success'));
		expect(publishPost).toHaveBeenCalledTimes(2);
	});

	it('선택한 대표 이미지를 주입된 발행 설정에 포함한다', async () => {
		const createObjectUrl = vi.fn(() => 'blob:selected-cover');
		const revokeObjectUrl = vi.fn();
		vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: createObjectUrl, revokeObjectURL: revokeObjectUrl }));
		const user = userEvent.setup();
		const navigate = vi.fn();
		const publishPost = vi.fn<PublishPost>().mockResolvedValue({ postId: 'with-cover', slug: 'rilog' });
		const { unmount } = render(
			<PostWriteWorkspace editorComponent={FakeEditor} publishPost={publishPost} navigate={navigate} />,
		);
		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '발행' }));
		const coverImage = new File(['image'], 'cover.png', { type: 'image/png' });
		await user.upload(screen.getByLabelText('이미지 선택'), coverImage);
		await selectFirstCoLog(user);
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		await waitFor(() => expect(navigate).toHaveBeenCalledWith('/@rilog/posts/with-cover'));
		expect(publishPost).toHaveBeenCalledOnce();
		expect(publishPost.mock.calls[0]?.[0].settings.representativeImage).toBe(coverImage);
		unmount();
		vi.unstubAllGlobals();
	});

	it('실제 발행 핸들러가 대표 이미지를 업로드하고 API 계약으로 전송한다', async () => {
		vi.stubGlobal(
			'URL',
			Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:selected-cover'), revokeObjectURL: vi.fn() }),
		);
		const user = userEvent.setup();
		const navigate = vi.fn();
		const coverImage = new File(['image'], 'cover.png', { type: 'image/png' });
		const { unmount } = render(<PostWriteWorkspace editorComponent={FakeEditor} navigate={navigate} />);

		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '발행' }));
		await user.upload(screen.getByLabelText('이미지 선택'), coverImage);
		await selectFirstCoLog(user);
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		await waitFor(() => expect(navigate).toHaveBeenCalledWith('/@jetproc/posts/77'));
		expect(uploadRepresentativeImageMock).toHaveBeenCalledWith({ file: coverImage, type: 'IMAGE' });
		expect(requestPostPublicationMock).toHaveBeenCalledWith({
			slug: 'jetproc',
			request: {
				title: 'BlockNote 도입기',
				content: [createParagraph('오늘 배운 내용을 기록합니다.')],
				category: 'TECH',
				visibility: 'PUBLIC',
				thumbnailImageUrl: 'posts/cover-object-key.png',
				profileImageUrl: 'profile/object-key.png',
			},
		});

		unmount();
		vi.unstubAllGlobals();
	});

	it('대표 이미지가 없으면 본문 이미지를 쓰지 않고 thumbnailImageUrl을 null로 전송한다', async () => {
		const user = userEvent.setup();
		const navigate = vi.fn();
		render(<PostWriteWorkspace editorComponent={FakeEditor} navigate={navigate} />);

		await fillValidPost(user);
		await user.click(screen.getByRole('button', { name: '발행' }));
		await selectFirstCoLog(user);
		await user.click(screen.getAllByRole('button', { name: '발행' }).at(-1)!);

		await waitFor(() => expect(navigate).toHaveBeenCalledWith('/@jetproc/posts/77'));
		expect(uploadRepresentativeImageMock).not.toHaveBeenCalled();
		expect(requestPostPublicationMock).toHaveBeenCalledWith(
			expect.objectContaining({
				request: expect.objectContaining({ thumbnailImageUrl: null }),
			}),
		);
	});

	it('dirty 상태의 내부 링크 이동을 확인하고 취소 또는 계속한다', async () => {
		const user = userEvent.setup();
		const navigate = vi.fn();
		const historyBackSpy = vi.spyOn(window.history, 'back');
		historyBackSpy.mockClear();
		render(<PostWriteWorkspace editorComponent={FakeEditor} navigate={navigate} />);
		await user.type(screen.getByRole('textbox', { name: '게시글 제목' }), '이탈 보호');

		const link = document.createElement('a');
		link.href = '/next-page?from=write';
		link.textContent = '다른 페이지';
		document.body.append(link);
		await user.click(link);
		const leaveDialog = screen.getByRole('dialog', { name: '작성 중인 글을 나갈까요?' });
		await user.click(within(leaveDialog).getByRole('button', { name: '계속 작성' }));
		expect(navigate).not.toHaveBeenCalled();

		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: '작성 중인 글을 나갈까요?' })).not.toBeInTheDocument(),
		);
		await user.click(link);
		await user.click(screen.getByRole('button', { name: '나가기' }));
		await waitFor(() => expect(navigate).toHaveBeenCalledWith('/next-page?from=write'));
		expect(historyBackSpy).not.toHaveBeenCalled();
		historyBackSpy.mockRestore();
		link.remove();
	});

	it('dirty 상태에서 beforeunload 기본 이탈 경고를 요청한다', async () => {
		const user = userEvent.setup();
		render(<PostWriteWorkspace editorComponent={FakeEditor} />);
		await user.type(screen.getByRole('textbox', { name: '게시글 제목' }), '새로고침 보호');

		const beforeUnloadEvent = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(beforeUnloadEvent);

		expect(beforeUnloadEvent.defaultPrevented).toBe(true);
	});
});
