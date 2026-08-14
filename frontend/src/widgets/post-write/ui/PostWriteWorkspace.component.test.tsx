import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useImperativeHandle, useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { Block } from '@blocknote/core';

import type { PostEditorProps } from '@/features/post-write/model/post-editor';

import PostWriteWorkspace from './PostWriteWorkspace';

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn() }),
}));

const createParagraph = (text = ''): Block => ({
	id: 'paragraph',
	type: 'paragraph',
	props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
	content: text.length > 0 ? [{ type: 'text', text, styles: {} }] : [],
	children: [],
});

function FakeEditor({ onChange, onReady, ariaDescribedBy, ref }: PostEditorProps) {
	const blocksRef = useRef<Block[]>([createParagraph()]);
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

describe('PostWriteWorkspace', () => {
	it('진입 시 제목에 focus하고 Enter를 누르면 본문으로 이동한다', async () => {
		const user = userEvent.setup();
		render(<PostWriteWorkspace editorComponent={FakeEditor} />);

		const titleField = screen.getByRole('textbox', { name: '게시글 제목' });
		expect(titleField).toHaveFocus();
		await user.type(titleField, '제목{enter}');
		expect(screen.getByRole('textbox', { name: '게시글 내용' })).toHaveFocus();
	});

	it('dirty 상태의 내부 링크 이동을 확인하고 취소 또는 계속한다', async () => {
		const user = userEvent.setup();
		const navigate = vi.fn();
		render(<PostWriteWorkspace editorComponent={FakeEditor} navigate={navigate} />);
		await user.type(screen.getByRole('textbox', { name: '게시글 제목' }), '이탈 보호');

		const link = document.createElement('a');
		link.href = '/next-page?from=write';
		link.textContent = '다른 페이지';
		document.body.append(link);
		await user.click(link);
		await user.click(screen.getByRole('button', { name: '계속 작성' }));
		expect(navigate).not.toHaveBeenCalled();

		await waitFor(() =>
			expect(screen.queryByRole('dialog', { name: '작성 중인 글을 나갈까요?' })).not.toBeInTheDocument(),
		);
		await user.click(link);
		await user.click(screen.getByRole('button', { name: '나가기' }));
		await waitFor(() => expect(navigate).toHaveBeenCalledWith('/next-page?from=write'));
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
