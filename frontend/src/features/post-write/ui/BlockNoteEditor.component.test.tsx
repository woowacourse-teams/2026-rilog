import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PostEditorHandle } from '../model/post-editor';
import type { Block } from '@blocknote/core';

import BlockNoteEditor from './BlockNoteEditor';

interface MockEditor {
	document: Block[];
	domElement: HTMLDivElement;
	focus: () => void;
}

const useCreateBlockNote = vi.fn<(...args: unknown[]) => MockEditor>();
const defaultUploadFile = vi.fn(() => Promise.resolve('data:image/png;base64,mock'));

vi.mock('@blocknote/react', () => ({
	useCreateBlockNote: (...args: unknown[]): MockEditor => useCreateBlockNote(...args),
}));

vi.mock('@blocknote/shadcn', () => ({
	BlockNoteView: ({ onChange }: { onChange: () => void }) => (
		<button type="button" onClick={onChange}>
			본문 변경
		</button>
	),
}));

describe('BlockNoteEditor', () => {
	const blocks: Block[] = [
		{
			id: 'paragraph-1',
			type: 'paragraph',
			content: [],
			children: [],
			props: { backgroundColor: 'default', textAlignment: 'left', textColor: 'default' },
		},
	];
	let editorElement: HTMLDivElement;
	let focusEditor: () => void;

	beforeEach(() => {
		editorElement = document.createElement('div');
		focusEditor = vi.fn();
		useCreateBlockNote.mockReturnValue({
			document: blocks,
			domElement: editorElement,
			focus: focusEditor,
		});
	});

	it('실제 editable element에 접근 가능한 이름과 오류 설명을 연결한다', async () => {
		const { rerender } = render(
			<BlockNoteEditor
				onChange={vi.fn()}
				onReady={vi.fn()}
				uploadFile={defaultUploadFile}
				ariaDescribedBy="post-body-error"
			/>,
		);

		await waitFor(() => {
			expect(editorElement).toHaveAttribute('aria-label', '게시글 내용');
			expect(editorElement).toHaveAttribute('aria-describedby', 'post-body-error');
		});

		rerender(<BlockNoteEditor onChange={vi.fn()} onReady={vi.fn()} uploadFile={defaultUploadFile} />);
		await waitFor(() => expect(editorElement).not.toHaveAttribute('aria-describedby'));
	});

	it('초기 문서와 변경된 문서를 외부 계약으로 전달한다', async () => {
		const user = userEvent.setup();
		const handleReady = vi.fn();
		const handleChange = vi.fn();
		const { getByRole } = render(
			<BlockNoteEditor onChange={handleChange} onReady={handleReady} uploadFile={defaultUploadFile} />,
		);

		await waitFor(() => expect(handleReady).toHaveBeenCalledWith(blocks));
		await user.click(getByRole('button', { name: '본문 변경' }));

		expect(handleChange).toHaveBeenCalledWith(blocks);
	});

	it('외부 ref의 focus 요청을 BlockNote editor에 위임한다', () => {
		const editorRef = createRef<PostEditorHandle>();
		render(<BlockNoteEditor ref={editorRef} onChange={vi.fn()} onReady={vi.fn()} uploadFile={defaultUploadFile} />);

		editorRef.current?.focus();

		expect(focusEditor).toHaveBeenCalledOnce();
	});

	it('주입된 파일 uploader를 BlockNote 생성 설정에 전달한다', () => {
		const configuredUploadFile = vi.fn<(file: File) => Promise<string>>();
		render(<BlockNoteEditor onChange={vi.fn()} onReady={vi.fn()} uploadFile={configuredUploadFile} />);

		expect(useCreateBlockNote).toHaveBeenCalledWith(expect.objectContaining({ uploadFile: configuredUploadFile }), [
			configuredUploadFile,
		]);
	});
});
