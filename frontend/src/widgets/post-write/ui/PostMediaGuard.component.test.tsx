import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Block } from '@blocknote/core';

import { AUTH_CONTEXT } from '@/features/auth/model/auth-context';
import type { PostEditorProps } from '@/features/post-write/model/post-editor';
import type { EditorDocument, PublicationSettings } from '@/features/post-write/model/post-publication';
import * as draftsApi from '@/shared/api/drafts/api';
import * as postsApi from '@/shared/api/posts/api';
import * as uploadsApi from '@/shared/api/uploads/api';
import * as usersApi from '@/shared/api/users/api';
import { renderWithQuery } from '@/test/render-with-query';

import DraftPostController from './DraftPostController';
import EditPostController from './EditPostController';
import NewPostController from './NewPostController';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

const paragraph: Block = {
	id: 'paragraph',
	type: 'paragraph',
	props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
	content: [{ type: 'text', text: '보존할 본문', styles: {} }],
	children: [],
};
const image = (url: string): Block => ({
	id: 'image',
	type: 'image',
	props: {
		url,
		backgroundColor: 'default',
		textAlignment: 'left',
		name: '',
		caption: '',
		showPreview: true,
		previewWidth: 512,
	},
	content: undefined,
	children: [],
});
const document: EditorDocument = {
	title: '보존할 제목',
	blocks: [paragraph, image('data:image/heic;base64,private-image')],
};
const settings: PublicationSettings = {
	category: 'TECH',
	blog: { type: 'RILOG', slug: 'author' },
	chapterId: null,
	representativeImage: null,
	representativeImageUrl: 'posts/safe-cover.png',
};

// 실제 BlockNote의 입력 동작은 E2E에서 확인하고 여기서는 편집기 문서 계약만 대체한다.
function MediaEditor({ initialBlocks, onReady, onChange }: PostEditorProps) {
	const blocks = useRef(initialBlocks ?? []);
	const [isReplaced, setIsReplaced] = useState(false);
	useEffect(() => onReady(blocks.current), [onReady]);
	return (
		<>
			<p>보존할 본문</p>
			<p>{isReplaced ? '정상 이미지' : '교체가 필요한 이미지'}</p>
			<button
				type="button"
				onClick={() => {
					blocks.current = [paragraph, image('https://cdn.rilog.test/body.png')];
					onChange(blocks.current);
					setIsReplaced(true);
				}}
			>
				파일로 교체
			</button>
		</>
	);
}

const modes = ['신규 발행', '게시글 수정', '임시글 발행', '임시저장', '임시글 덮어쓰기'] as const;

describe('실제 저장 흐름의 미디어 검증', () => {
	beforeEach(() => {
		vi.spyOn(usersApi, 'readMyInfo').mockResolvedValue({
			status: 200,
			message: 'OK',
			data: { id: 1, slug: 'author', nickname: '작성자', profileImageUrl: null },
		});
		vi.spyOn(usersApi, 'readMyCologsOverview').mockResolvedValue({ status: 200, message: 'OK', data: [] });
		vi.spyOn(draftsApi, 'readMyDraftList').mockResolvedValue({
			status: 200,
			message: 'OK',
			data: { drafts: [], page: 0, size: 10, numberOfElements: 0, hasNext: false },
		});
	});
	afterEach(() => {
		vi.restoreAllMocks();
		window.history.replaceState(null, '', '/');
	});

	it.each(modes)('%s에서 정상 썸네일로 우회하지 못하고 내용을 유지한 채 이미지 교체 후 재시도한다', async (mode) => {
		const user = userEvent.setup();
		const navigate = vi.fn();
		const publish = vi
			.spyOn(postsApi, 'publishPost')
			.mockResolvedValue({ status: 201, message: 'OK', data: { postId: 31, slug: 'author' } });
		const update = vi
			.spyOn(postsApi, 'updatePost')
			.mockResolvedValue({ status: 200, message: 'OK', data: { postId: 31, slug: 'author' } });
		const draftPublish = vi
			.spyOn(draftsApi, 'publishDraft')
			.mockResolvedValue({ status: 201, message: 'OK', data: { postId: 31, slug: 'author' } });
		const save = vi
			.spyOn(draftsApi, 'saveDraft')
			.mockResolvedValue({ status: 201, message: 'OK', data: { draftId: 42 } });
		const overwrite = vi
			.spyOn(draftsApi, 'overwriteDraft')
			.mockResolvedValue({ status: 200, message: 'OK', data: { draftId: 42 } });
		const upload = vi.spyOn(uploadsApi, 'uploadFileWithPresignedUrl');
		const props = { initialDocument: document, editorComponent: MediaEditor, navigate };
		const controller =
			mode === '게시글 수정' ? (
				<EditPostController {...props} postId={31} initialPublicationSettings={settings} />
			) : mode === '임시글 발행' || mode === '임시글 덮어쓰기' ? (
				<DraftPostController {...props} draftId={42} initialPublicationSettings={settings} />
			) : (
				<NewPostController {...props} />
			);
		renderWithQuery(
			<AUTH_CONTEXT value={{ isAuthenticated: true, isInitialized: true, isOnboarding: false, sessionVersion: 0 }}>
				{controller}
			</AUTH_CONTEXT>,
		);
		await waitFor(() => expect(usersApi.readMyInfo).toHaveBeenCalled());
		const title = screen.getByRole('textbox', { name: '게시글 제목' });
		fireEvent.change(title, { target: { value: '보존할 제목 변경' } });
		const isDraftSave = mode === '임시저장' || mode === '임시글 덮어쓰기';
		const submit = async () => {
			if (isDraftSave) {
				await user.click(screen.getByRole('button', { name: '임시저장' }));
				return;
			}
			await user.click(screen.getByRole('button', { name: mode === '게시글 수정' ? '수정' : '발행' }));
			const modal = screen.getByRole('dialog', { name: '게시 설정' });
			// 신규 글에서도 본문 자동 썸네일 대신 정상 기본 이미지를 선택한다.
			const removeImage = within(modal).queryByRole('button', { name: '이미지 제거' });
			if (removeImage !== null) await user.click(removeImage);
			await user.click(within(modal).getByRole('button', { name: '발행' }));
		};
		await submit();
		expect(await screen.findByText(/해당 항목을 삭제하고 파일로 다시 업로드해 주세요/)).toBeInTheDocument();
		for (const request of [publish, update, draftPublish, save, overwrite, upload])
			expect(request).not.toHaveBeenCalled();
		expect(title).toHaveValue('보존할 제목 변경');
		expect(screen.getByText('보존할 본문')).toBeInTheDocument();
		expect(screen.getByText('교체가 필요한 이미지')).toBeInTheDocument();
		expect(navigate).not.toHaveBeenCalled();
		if (!isDraftSave)
			await user.click(within(screen.getByRole('dialog', { name: '게시 설정' })).getByRole('button', { name: '취소' }));
		if (!isDraftSave)
			await waitFor(() => expect(screen.queryByRole('dialog', { name: '게시 설정' })).not.toBeInTheDocument());
		// 실제 beforeunload 동작은 E2E로 보호하며 실패 시 dirty 상태도 유지되는지 확인한다.
		const leave = new Event('beforeunload', { cancelable: true });
		window.dispatchEvent(leave);
		expect(leave.defaultPrevented).toBe(true);
		await user.click(screen.getByRole('button', { name: '파일로 교체' }));
		await submit();
		const expected =
			mode === '신규 발행'
				? publish
				: mode === '게시글 수정'
					? update
					: mode === '임시글 발행'
						? draftPublish
						: mode === '임시저장'
							? save
							: overwrite;
		await waitFor(() => expect(expected).toHaveBeenCalledOnce());
		expect(JSON.stringify(expected.mock.calls)).not.toContain('private-image');
		expect(JSON.stringify(expected.mock.calls)).toContain('https://cdn.rilog.test/body.png');
	});
});
