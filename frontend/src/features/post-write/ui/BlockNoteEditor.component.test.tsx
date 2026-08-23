import { render, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { PostEditorHandle } from '../model/post-editor';
import type { Block } from '@blocknote/core';
import type { ReactNode } from 'react';

import BlockNoteEditor from './BlockNoteEditor';

interface MockEditor {
	document: Block[];
	domElement: HTMLDivElement;
	focus: () => void;
}

interface SuggestionMenuControllerProps {
	triggerCharacter: string;
	shouldOpen?: (state: {
		selection: { $from: { parent: { type: { isInGroup: (name: string) => boolean } } } };
	}) => boolean;
	floatingUIOptions?: {
		useFloatingOptions?: {
			middleware?: unknown[];
			placement?: string;
			strategy?: string;
			whileElementsMounted?: unknown;
		};
	};
}

const useCreateBlockNote = vi.fn<(...args: unknown[]) => MockEditor>();
const defaultUploadFile = vi.fn(() => Promise.resolve('data:image/png;base64,mock'));
const suggestionMenuControllerProps = vi.fn<(props: SuggestionMenuControllerProps) => void>();

vi.mock('@blocknote/react', () => ({
	useCreateBlockNote: (...args: unknown[]): MockEditor => useCreateBlockNote(...args),
	SuggestionMenuController: (props: SuggestionMenuControllerProps) => {
		suggestionMenuControllerProps(props);

		return <div data-testid="slash-menu-controller" data-trigger-character={props.triggerCharacter} />;
	},
}));

vi.mock('@blocknote/shadcn', () => ({
	BlockNoteView: ({
		children,
		onChange,
		slashMenu,
	}: {
		children: ReactNode;
		onChange: () => void;
		slashMenu?: boolean;
	}) => (
		<>
			<button type="button" data-slash-menu={String(slashMenu)} onClick={onChange}>
				본문 변경
			</button>
			{children}
		</>
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
		suggestionMenuControllerProps.mockClear();
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

	it('마크다운 단축 문법과 블록 선택 방법을 placeholder로 안내한다', () => {
		render(<BlockNoteEditor onChange={vi.fn()} onReady={vi.fn()} uploadFile={defaultUploadFile} />);
		const placeholders = expect.objectContaining({
			default: '마크다운 단축 문법을 사용할 수 있습니다. /를 입력하면 블록을 선택할 수 있습니다.',
		}) as unknown as Record<string, unknown>;
		const dictionary = expect.objectContaining({ placeholders }) as unknown as Record<string, unknown>;

		expect(useCreateBlockNote).toHaveBeenLastCalledWith(
			expect.objectContaining({
				dictionary,
			}),
			[defaultUploadFile],
		);
	});

	it('가용 공간을 기준으로 배치하는 커스텀 슬래시 메뉴를 사용한다', () => {
		const { getByRole, getByTestId } = render(
			<BlockNoteEditor onChange={vi.fn()} onReady={vi.fn()} uploadFile={defaultUploadFile} />,
		);
		const latestControllerProps = suggestionMenuControllerProps.mock.calls.at(-1)?.[0];

		if (latestControllerProps === undefined) {
			throw new Error('SuggestionMenuController props를 찾을 수 없습니다.');
		}

		const { shouldOpen, floatingUIOptions } = latestControllerProps;

		expect(getByRole('button', { name: '본문 변경' })).toHaveAttribute('data-slash-menu', 'false');
		expect(getByTestId('slash-menu-controller')).toHaveAttribute('data-trigger-character', '/');
		expect(typeof shouldOpen).toBe('function');
		expect(
			shouldOpen?.({
				selection: { $from: { parent: { type: { isInGroup: (name: string) => name === 'tableContent' } } } },
			}),
		).toBe(false);
		expect(shouldOpen?.({ selection: { $from: { parent: { type: { isInGroup: () => false } } } } })).toBe(true);
		expect(floatingUIOptions?.useFloatingOptions?.placement).toBe('bottom-start');
		expect(floatingUIOptions?.useFloatingOptions?.strategy).toBe('fixed');
		expect(floatingUIOptions?.useFloatingOptions?.middleware).toHaveLength(1);
	});
});
