'use client';

import { filterSuggestionItems } from '@blocknote/core/extensions';
import { ko } from '@blocknote/core/locales';
import { getDefaultReactSlashMenuItems, SuggestionMenuController, useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import { useEffect, useImperativeHandle, useRef } from 'react';

import type { PostEditorProps } from '../model/post-editor';
import type { FloatingUIOptions } from '@blocknote/react';

import '@blocknote/shadcn/style.css';
import {
	calculateSlashMenuLayout,
	clampSlashMenuCoordinate,
	SLASH_MENU_EDGE_PADDING,
	SLASH_MENU_GAP,
	SLASH_MENU_INITIAL_HEIGHT,
} from '../lib/calculate-slash-menu-layout';
import { constrainEditorDragSelection } from '../lib/constrain-editor-drag-selection';
import { limitEditorHeadingLevels } from '../lib/limit-editor-heading-levels';
import { POST_WRITE_SCHEMA } from '../lib/post-write-schema';
import { getRecentCodeLanguage } from '../lib/recent-code-language';
import '../styles/blocknote-theme.css';

import CodeLanguageDropdownController from './CodeLanguageDropdown';

const CODE_GRAPHEME_SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'grapheme' });

const isExplicitMarkdownLanguage = (block: { content: unknown } | undefined): boolean => {
	if (block === undefined || !Array.isArray(block.content)) {
		return false;
	}

	const source = block.content
		.map((part: { type?: string; text?: string }) => (part.type === 'text' ? (part.text ?? '') : ''))
		.join('');
	return /^```\S+/.test(source);
};
const isClippingElement = (element: Element): boolean => {
	const ownerWindow = element.ownerDocument.defaultView ?? window;
	const { overflow, overflowX, overflowY } = ownerWindow.getComputedStyle(element);
	return [overflow, overflowX, overflowY].some((value) => /auto|scroll|hidden|clip/.test(value));
};

const intersectRects = (first: DOMRect, second: DOMRect): DOMRect => {
	const left = Math.max(first.left, second.left);
	const top = Math.max(first.top, second.top);
	const right = Math.max(left, Math.min(first.right, second.right));
	const bottom = Math.max(top, Math.min(first.bottom, second.bottom));

	return new DOMRect(left, top, right - left, bottom - top);
};

const getSlashMenuBoundary = (floatingElement: HTMLElement, referenceElement: Element | null): DOMRect => {
	const ownerWindow = floatingElement.ownerDocument.defaultView ?? window;
	const visualViewport = ownerWindow.visualViewport;
	let boundary = new DOMRect(
		visualViewport?.offsetLeft ?? 0,
		visualViewport?.offsetTop ?? 0,
		visualViewport?.width ?? ownerWindow.innerWidth,
		visualViewport?.height ?? ownerWindow.innerHeight,
	);

	for (
		let element = referenceElement?.parentElement;
		element !== null && element !== undefined;
		element = element.parentElement
	) {
		if (isClippingElement(element)) {
			boundary = intersectRects(boundary, element.getBoundingClientRect());
		}
	}

	return boundary;
};

const getReferenceElement = (reference: unknown): Element | null => {
	if (typeof reference !== 'object' || reference === null || !('contextElement' in reference)) {
		return null;
	}

	const contextElement = reference.contextElement;
	return contextElement instanceof Element ? contextElement : null;
};

const subscribeVisualViewportUpdates = (floatingElement: HTMLElement, update: () => void): (() => void) => {
	const visualViewport = floatingElement.ownerDocument.defaultView?.visualViewport;
	if (visualViewport === undefined || visualViewport === null) {
		return () => undefined;
	}

	visualViewport.addEventListener('resize', update);
	visualViewport.addEventListener('scroll', update);

	return () => {
		visualViewport.removeEventListener('resize', update);
		visualViewport.removeEventListener('scroll', update);
	};
};

const slashMenuFloatingUIOptions = {
	useFloatingOptions: {
		placement: 'bottom-start',
		strategy: 'fixed',
		whileElementsMounted: (_reference, floating, update) => subscribeVisualViewportUpdates(floating, update),
		middleware: [
			{
				name: 'rilogSlashMenuPosition',
				fn: ({ elements, placement, rects, x, y }) => {
					const boundary = getSlashMenuBoundary(elements.floating, getReferenceElement(elements.reference));
					const menuHeight = elements.floating.scrollHeight || rects.floating.height || SLASH_MENU_INITIAL_HEIGHT;
					const layout = calculateSlashMenuLayout({
						boundary,
						menuHeight,
						reference: { top: rects.reference.y, bottom: rects.reference.y + rects.reference.height },
					});
					const maxHeight = `${layout.maxHeight}px`;
					const maxWidth = `${layout.maxWidth}px`;
					const sizeChanged =
						elements.floating.style.maxHeight !== maxHeight || elements.floating.style.maxWidth !== maxWidth;

					elements.floating.style.maxHeight = maxHeight;
					elements.floating.style.maxWidth = maxWidth;

					if (placement !== layout.placement) {
						return { reset: { placement: layout.placement } };
					}

					if (sizeChanged) {
						return { reset: { rects: true } };
					}

					const offsetY = layout.placement === 'bottom-start' ? y + SLASH_MENU_GAP : y - SLASH_MENU_GAP;
					return {
						x: clampSlashMenuCoordinate(
							x,
							boundary.left + SLASH_MENU_EDGE_PADDING,
							boundary.right - rects.floating.width - SLASH_MENU_EDGE_PADDING,
						),
						y: clampSlashMenuCoordinate(
							offsetY,
							boundary.top + SLASH_MENU_EDGE_PADDING,
							boundary.bottom - rects.floating.height - SLASH_MENU_EDGE_PADDING,
						),
					};
				},
			},
		],
	},
} satisfies FloatingUIOptions;

export default function BlockNoteEditor({
	initialBlocks,
	onChange,
	onReady,
	uploadFile,
	ariaDescribedBy,
	ref,
}: PostEditorProps) {
	const codeBlockSlashItemInProgress = useRef(false);
	// 한국어 UI와 외부에서 주입한 이미지 uploader를 적용한 에디터
	const editor = useCreateBlockNote(
		{
			...(initialBlocks === undefined || initialBlocks.length === 0
				? {}
				: { initialContent: limitEditorHeadingLevels(initialBlocks) }),
			schema: POST_WRITE_SCHEMA,
			dictionary: {
				...ko,
				placeholders: {
					...ko.placeholders,
					default: '마크다운 단축 문법을 사용할 수 있습니다. /를 입력하면 블록을 선택할 수 있습니다.',
				},
			},
			uploadFile,
		},
		[initialBlocks, uploadFile],
	);

	useEffect(
		() =>
			editor.onChange((currentEditor, context) => {
				for (const change of context.getChanges()) {
					if (change.block.type === 'heading' && change.block.props.level > 4) {
						currentEditor.updateBlock(change.block, { props: { level: 4 } });
						continue;
					}

					if (
						change.source.type !== 'local' ||
						!(
							(change.type === 'insert' && codeBlockSlashItemInProgress.current) ||
							(change.type === 'update' && change.prevBlock.type !== 'codeBlock')
						) ||
						change.block.type !== 'codeBlock' ||
						(change.block.props.language !== 'text' && change.block.props.language !== '') ||
						isExplicitMarkdownLanguage(change.prevBlock) ||
						change.block.content.length !== 0
					) {
						continue;
					}

					const language = getRecentCodeLanguage();
					if (change.block.props.language !== language) {
						currentEditor.updateBlock(change.block, { props: { language } });
					}
				}
			}),
		[editor],
	);

	// 제목에서 Enter를 누르거나 검증에 실패했을 때 실제 에디터로 focus할 수 있도록 useImperativeHandle(리모콘 역할) 사용
	useImperativeHandle(ref, () => ({
		focus: () => editor.focus(),
	}));

	// 에디터 생성이 끝나면 초기 문서를 부모에 전달해 발행 가능 상태로 전환
	useEffect(() => {
		onReady([...editor.document]);
	}, [editor, onReady]);

	// BlockNote가 생성한 실제 editable element에 접근성 이름과 오류 메시지 연결
	useEffect(() => {
		const editorElement = editor.domElement;
		if (editorElement === undefined) {
			return;
		}

		editorElement.classList.add('ph-mask');
		editorElement.setAttribute('data-ph-sensitive-media', '');
		editorElement.setAttribute('aria-label', '게시글 내용');
		if (ariaDescribedBy === undefined) {
			editorElement.removeAttribute('aria-describedby');
		} else {
			editorElement.setAttribute('aria-describedby', ariaDescribedBy);
		}
	}, [ariaDescribedBy, editor]);

	useEffect(() => {
		const editorElement = editor.domElement;
		return editorElement === undefined ? undefined : constrainEditorDragSelection(editorElement);
	}, [editor]);

	useEffect(() => {
		const editorElement = editor.domElement;
		if (editorElement === undefined) {
			return;
		}

		const handleLastCodeCharacterDeletion = (event: KeyboardEvent) => {
			if (event.key !== 'Backspace' || event.isComposing || event.target !== editorElement) {
				return;
			}

			const { selection } = editor.prosemirrorState;
			const code = selection.$from.parent;
			const content = code.textContent;
			if (
				!selection.empty ||
				code.type.name !== 'codeBlock' ||
				selection.$from.parentOffset !== content.length ||
				[...CODE_GRAPHEME_SEGMENTER.segment(content)].length !== 1
			) {
				return;
			}

			event.preventDefault();
			event.stopPropagation();
			// Native deletion removes BlockNote's empty <code> contentDOM, so delete through ProseMirror instead.
			editor.transact((transaction) => transaction.delete(selection.from - content.length, selection.from));
		};

		editorElement.ownerDocument.addEventListener('keydown', handleLastCodeCharacterDeletion, true);
		return () => editorElement.ownerDocument.removeEventListener('keydown', handleLastCodeCharacterDeletion, true);
	}, [editor]);

	return (
		<div className="post-write-blocknote">
			<BlockNoteView editor={editor} theme="light" slashMenu={false} onChange={() => onChange([...editor.document])}>
				<SuggestionMenuController
					triggerCharacter="/"
					getItems={(query) => Promise.resolve(filterSuggestionItems(getDefaultReactSlashMenuItems(editor), query))}
					onItemClick={(item) => {
						if ('key' in item && item.key === 'code_block') {
							codeBlockSlashItemInProgress.current = true;
							try {
								item.onItemClick();
							} finally {
								codeBlockSlashItemInProgress.current = false;
							}
						} else {
							item.onItemClick();
						}
					}}
					shouldOpen={(state) => !state.selection.$from.parent.type.isInGroup('tableContent')}
					floatingUIOptions={slashMenuFloatingUIOptions}
				/>
			</BlockNoteView>
			<CodeLanguageDropdownController editor={editor} />
		</div>
	);
}
