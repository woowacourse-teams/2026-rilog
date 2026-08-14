import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, useImperativeHandle, useRef } from 'react';
import { describe, expect, it } from 'vitest';

import type { Block } from '@blocknote/core';

import type { PostEditorProps } from '@/features/post-write/model/post-editor';

import PostWriteWorkspace from './PostWriteWorkspace';

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
});
