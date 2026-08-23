'use client';

import { ko } from '@blocknote/core/locales';
import { SuggestionMenuController, useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/shadcn';
import { useEffect, useImperativeHandle } from 'react';

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
import '../styles/blocknote-theme.css';

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

export default function BlockNoteEditor({ onChange, onReady, uploadFile, ariaDescribedBy, ref }: PostEditorProps) {
	// 한국어 UI와 외부에서 주입한 이미지 uploader를 적용한 에디터
	const editor = useCreateBlockNote(
		{
			dictionary: {
				...ko,
				placeholders: {
					...ko.placeholders,
					default: '마크다운 단축 문법을 사용할 수 있습니다. /를 입력하면 블록을 선택할 수 있습니다.',
				},
			},
			uploadFile,
		},
		[uploadFile],
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

		editorElement.setAttribute('aria-label', '게시글 내용');
		if (ariaDescribedBy === undefined) {
			editorElement.removeAttribute('aria-describedby');
		} else {
			editorElement.setAttribute('aria-describedby', ariaDescribedBy);
		}
	}, [ariaDescribedBy, editor]);

	return (
		<div className="post-write-blocknote">
			<BlockNoteView editor={editor} theme="light" slashMenu={false} onChange={() => onChange([...editor.document])}>
				<SuggestionMenuController
					triggerCharacter="/"
					shouldOpen={(state) => !state.selection.$from.parent.type.isInGroup('tableContent')}
					floatingUIOptions={slashMenuFloatingUIOptions}
				/>
			</BlockNoteView>
		</div>
	);
}
