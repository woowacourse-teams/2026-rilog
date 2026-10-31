import { SideMenuExtension } from '@blocknote/core/extensions';

import type { DragSource, DropLayout, DropLayoutBlock, DropPosition, DropRect } from './image-row-drop-policy';
import type { PostWriteBlockNoteEditor } from './post-write-schema';

import { applyImageRowDrop, classifyDragSource, isImageRow, isPlainImage } from './image-row';
import { resolveImageRowDrop } from './image-row-drop-policy';

const GUIDE_GAP = 16;

const BLOCK_SELECTOR = '.bn-block[data-id], .bn-block-column-list[data-id]';

const getImageBlockElement = (target: EventTarget | null): HTMLElement | null => {
	if (!(target instanceof Element)) return null;
	const block = target.closest<HTMLElement>('.bn-block[data-id]');
	return block?.querySelector('.bn-block-content[data-content-type="image"]') ? block : null;
};

const toRect = (element: Element): DropRect => {
	const { left, top, right, bottom } = element.getBoundingClientRect();
	return { left, top, right, bottom };
};

/** 최상위 블록과 이미지행의 열 영역을 DOM에서 읽어 판정 함수가 쓰는 레이아웃으로 만든다. */
const readDropLayout = (editor: PostWriteBlockNoteEditor, root: HTMLElement): DropLayout => {
	const elements = new Map<string, HTMLElement>();
	root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR).forEach((element) => {
		const id = element.dataset.id;
		if (id !== undefined && !elements.has(id)) elements.set(id, element);
	});

	const blocks: DropLayoutBlock[] = [];
	for (const block of editor.document) {
		const element = elements.get(block.id);
		if (element === undefined) continue;
		const rect = toRect(element);
		if (rect.bottom - rect.top <= 0) continue;

		if (isImageRow(block)) {
			const columns = block.children.flatMap((column) => {
				const imageId = column.children[0].id;
				const columnElement = elements.get(imageId)?.closest('.bn-block-column');
				return columnElement ? [{ imageId, rect: toRect(columnElement) }] : [];
			});
			blocks.push(
				columns.length === block.children.length
					? { kind: 'row', id: block.id, rect, columns }
					: { kind: 'other', id: block.id, rect },
			);
		} else if (isPlainImage(block)) {
			blocks.push({ kind: 'image', id: block.id, rect });
		} else {
			blocks.push({ kind: 'other', id: block.id, rect });
		}
	}
	return { editor: toRect(root), blocks };
};

type GuideShape =
	| { orientation: 'vertical'; x: number; top: number; height: number }
	| { orientation: 'horizontal'; left: number; y: number; width: number };

/** 판정 결과에 맞는 가이드선: 좌우는 삽입 경계의 세로선, 상하는 대상 블록(이미지행이면 행 전체)의 가로선. */
const getGuideShape = (drop: DropPosition, layout: DropLayout, root: HTMLElement): GuideShape | null => {
	if (drop.direction === 'top' || drop.direction === 'bottom') {
		const block = layout.blocks.find((candidate) => candidate.id === drop.targetId);
		if (block === undefined) return null;
		return {
			orientation: 'horizontal',
			left: block.rect.left,
			y: drop.direction === 'top' ? block.rect.top : block.rect.bottom,
			width: block.rect.right - block.rect.left,
		};
	}

	const row = layout.blocks.find(
		(candidate) => candidate.kind === 'row' && candidate.columns.some((column) => column.imageId === drop.targetId),
	);
	if (row?.kind === 'row') {
		const previous = row.columns[drop.insertIndex - 1];
		const next = row.columns[drop.insertIndex];
		const x =
			previous && next
				? (previous.rect.right + next.rect.left) / 2
				: next
					? next.rect.left - GUIDE_GAP
					: (previous?.rect.right ?? row.rect.right) + GUIDE_GAP;
		return { orientation: 'vertical', x, top: row.rect.top, height: row.rect.bottom - row.rect.top };
	}

	const block = layout.blocks.find((candidate) => candidate.id === drop.targetId);
	if (block === undefined) return null;
	const image = [...root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)]
		.find((element) => element.dataset.id === block.id)
		?.querySelector('img');
	const rect = image && image.getBoundingClientRect().width > 0 ? toRect(image) : block.rect;
	return {
		orientation: 'vertical',
		x: drop.direction === 'left' ? rect.left - GUIDE_GAP : rect.right + GUIDE_GAP,
		top: rect.top,
		height: rect.bottom - rect.top,
	};
};

/**
 * 이미지 가로 배치 드래그 정책을 에디터에 연결한다.
 * 드래그 중 블록은 모두 이 정책으로만 드롭할 수 있고, 가이드선이 없는 위치에는 드롭되지 않는다.
 */
export const installImageRowDrag = (editor: PostWriteBlockNoteEditor): (() => void) => {
	const root = editor.domElement;
	if (root === undefined) return () => undefined;

	const ownerDocument = root.ownerDocument;
	let source: DragSource | null = null;
	let lastPointer: { x: number; y: number } | null = null;
	const verticalGuide = ownerDocument.createElement('div');
	verticalGuide.className = 'post-write-image-row-guide';
	verticalGuide.setAttribute('aria-hidden', 'true');
	verticalGuide.hidden = true;
	ownerDocument.body.append(verticalGuide);
	const horizontalGuide = ownerDocument.createElement('div');
	horizontalGuide.className = 'post-write-image-row-detach-guide';
	horizontalGuide.setAttribute('aria-hidden', 'true');
	horizontalGuide.hidden = true;
	ownerDocument.body.append(horizontalGuide);

	const prepareImages = () => {
		root.querySelectorAll<HTMLImageElement>('.bn-block-content[data-content-type="image"] img').forEach((image) => {
			image.draggable = true;
		});
	};
	prepareImages();
	const observer = new MutationObserver(prepareImages);
	observer.observe(root, { childList: true, subtree: true });

	const clearGuide = () => {
		verticalGuide.hidden = true;
		horizontalGuide.hidden = true;
	};
	const resetDrag = () => {
		source = null;
		lastPointer = null;
		root.classList.remove('post-write-image-row-dragging');
		clearGuide();
	};

	const resolveDrop = (clientX: number, clientY: number): { drop: DropPosition; layout: DropLayout } | null => {
		if (source === null) return null;
		const layout = readDropLayout(editor, root);
		const drop = resolveImageRowDrop(clientX, clientY, source, layout);
		return drop === null ? null : { drop, layout };
	};

	const updateGuide = (clientX: number, clientY: number): DropPosition | null => {
		clearGuide();
		const resolved = resolveDrop(clientX, clientY);
		if (resolved === null) return null;
		const shape = getGuideShape(resolved.drop, resolved.layout, root);
		if (shape === null) return null;
		if (shape.orientation === 'vertical') {
			verticalGuide.style.left = `${shape.x}px`;
			verticalGuide.style.top = `${shape.top}px`;
			verticalGuide.style.height = `${shape.height}px`;
			verticalGuide.hidden = false;
		} else {
			horizontalGuide.style.left = `${shape.left}px`;
			horizontalGuide.style.top = `${shape.y}px`;
			horizontalGuide.style.width = `${shape.width}px`;
			horizontalGuide.hidden = false;
		}
		return resolved.drop;
	};

	const onDragStart = (event: DragEvent) => {
		resetDrag();
		const target = event.target;
		if (!(target instanceof Element)) return;

		const isImage = target instanceof HTMLImageElement && root.contains(target);
		const isHandle = target.closest('.bn-side-menu [draggable="true"]') !== null;
		if (!isImage && !isHandle) return;

		const blockId = isImage
			? getImageBlockElement(target)?.dataset.id
			: editor.getExtension(SideMenuExtension)?.store.state?.block.id;
		if (blockId === undefined) return;

		// 드래그 핸들이 선택 범위 안에 있으면 선택한 블록 전체가 소스다(다중 선택).
		const selectedIds = isHandle ? (editor.getSelection()?.blocks.map((block) => block.id) ?? []) : [];
		const blockIds = selectedIds.length >= 2 && selectedIds.includes(blockId) ? selectedIds : [blockId];
		const dragSource = classifyDragSource(editor, blockIds);
		if (dragSource === null) {
			// 이미지행 전체/일부 이동은 이번 범위 밖이라 드래그 시작 단계에서 막는다.
			event.preventDefault();
			event.stopImmediatePropagation();
			return;
		}
		source = dragSource;
		root.classList.add('post-write-image-row-dragging');

		if (isImage) {
			event.dataTransfer?.setData('text/plain', blockId);
			event.stopPropagation();
		}
	};

	const onDragOver = (event: DragEvent) => {
		if (source === null) return;
		lastPointer = { x: event.clientX, y: event.clientY };
		const drop = updateGuide(event.clientX, event.clientY);
		if (drop !== null) {
			event.preventDefault();
			if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
			event.stopImmediatePropagation();
			return;
		}
		// 가이드선이 없으면 드롭을 허용하지 않고 에디터 기본 드롭 처리도 막는다.
		if (event.target instanceof Node && root.contains(event.target)) event.stopImmediatePropagation();
	};

	const onDrop = (event: DragEvent) => {
		if ('synthetic' in event && event.synthetic === true) return;
		if (source === null) return;
		const currentSource = source;
		const resolved = resolveDrop(event.clientX, event.clientY);
		resetDrag();
		event.preventDefault();
		event.stopImmediatePropagation();
		if (resolved !== null) applyImageRowDrop(editor, currentSource, resolved.drop);
	};

	const onViewportChange = () => {
		if (lastPointer !== null) updateGuide(lastPointer.x, lastPointer.y);
	};
	const onDragLeave = (event: DragEvent) => {
		if (
			event.relatedTarget === null &&
			(event.target === ownerDocument.documentElement || event.target === ownerDocument.body)
		)
			clearGuide();
	};
	const onKeyDown = (event: KeyboardEvent) => {
		if (event.key === 'Escape') resetDrag();
	};

	const view = ownerDocument.defaultView;
	view?.addEventListener('dragstart', onDragStart, true);
	view?.addEventListener('dragend', resetDrag, true);
	view?.addEventListener('dragover', onDragOver, true);
	view?.addEventListener('dragleave', onDragLeave, true);
	view?.addEventListener('drop', onDrop, true);
	view?.addEventListener('scroll', onViewportChange, true);
	view?.addEventListener('resize', onViewportChange);
	view?.addEventListener('keydown', onKeyDown, true);

	return () => {
		observer.disconnect();
		resetDrag();
		verticalGuide.remove();
		horizontalGuide.remove();
		view?.removeEventListener('dragstart', onDragStart, true);
		view?.removeEventListener('dragend', resetDrag, true);
		view?.removeEventListener('dragover', onDragOver, true);
		view?.removeEventListener('dragleave', onDragLeave, true);
		view?.removeEventListener('drop', onDrop, true);
		view?.removeEventListener('scroll', onViewportChange, true);
		view?.removeEventListener('resize', onViewportChange);
		view?.removeEventListener('keydown', onKeyDown, true);
	};
};
