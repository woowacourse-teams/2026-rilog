import type { DragSource, DropPosition } from './image-row-drop-policy';
import type { PostWriteBlockNoteEditor } from './post-write-schema';

import { MAX_IMAGE_ROW_COLUMNS } from './image-row-drop-policy';

type EditorBlock = PostWriteBlockNoteEditor['document'][number];
type ColumnListBlock = Extract<EditorBlock, { type: 'columnList' }>;
type ImageBlock = Extract<EditorBlock, { type: 'image' }>;
type ImageRowAddAction = { kind: 'default' } | { kind: 'after-row'; rowId: string } | { kind: 'hidden' };

/** 업로드가 끝났고 하위 블록이 없는 이미지 블록만 가로 배치에 참여한다. */
export const isPlainImage = (block: EditorBlock | undefined): block is ImageBlock =>
	block?.type === 'image' && block.props.url.trim().length > 0 && block.children.length === 0;

/** 이미지행: 이미지 블록 하나씩만 담은 2~3개의 열. 그 외 columnList는 일반 블록으로 취급한다. */
export const isImageRow = (block: EditorBlock): block is ColumnListBlock =>
	block.type === 'columnList' &&
	block.children.length >= 2 &&
	block.children.length <= MAX_IMAGE_ROW_COLUMNS &&
	block.children.every(
		(column) => column.type === 'column' && column.children.length === 1 && isPlainImage(column.children[0]),
	);

export const findImageRow = (editor: PostWriteBlockNoteEditor, imageId: string): ColumnListBlock | undefined =>
	editor.document.find(
		(block): block is ColumnListBlock =>
			isImageRow(block) && block.children.some((column) => column.children[0]?.id === imageId),
	);

export const getImageRowAddAction = (editor: PostWriteBlockNoteEditor, blockId: string): ImageRowAddAction => {
	const row = findImageRow(editor, blockId);
	if (row === undefined) return { kind: 'default' };
	return row.children[0]?.children[0]?.id === blockId ? { kind: 'after-row', rowId: row.id } : { kind: 'hidden' };
};

const isInsideColumnList = (editor: PostWriteBlockNoteEditor, blockId: string): boolean => {
	const contains = (block: EditorBlock): boolean =>
		block.children.some((child) => child.id === blockId || contains(child));
	return editor.document.some((block) => block.type === 'columnList' && contains(block));
};

/**
 * 드래그 시작 시 소스 종류를 정한다. null이면 이번 범위 밖이므로 드래그를 시작하지 않는다.
 * - 이미지행 전체 이동과 이미지행 안 일부 이미지만의 다중 선택은 추후 함께 지원한다.
 */
export const classifyDragSource = (editor: PostWriteBlockNoteEditor, blockIds: string[]): DragSource | null => {
	if (blockIds.length === 0) return null;
	const blocks = blockIds.map((id) => editor.getBlock(id));
	if (blocks.some((block) => block === undefined)) return null;
	if (blocks.some((block) => block?.type === 'columnList' || block?.type === 'column')) return null;

	if (blockIds.length >= 2) {
		if (blockIds.some((id) => isInsideColumnList(editor, id))) return null;
		return { kind: 'multi', blockIds };
	}

	const [blockId] = blockIds;
	const row = findImageRow(editor, blockId);
	if (row !== undefined) return { kind: 'column-image', blockId, rowId: row.id };
	if (isPlainImage(editor.document.find((block) => block.id === blockId))) return { kind: 'standalone-image', blockId };
	return { kind: 'other', blockId };
};

/** 이미지행에서 이미지를 뺀다. 2장 → 1장이면 행을 풀어 남은 이미지를 단독 이미지로 되돌린다. */
const removeFromRow = (editor: PostWriteBlockNoteEditor, row: ColumnListBlock, imageId: string) => {
	const remaining = row.children.filter((column) => column.children[0]?.id !== imageId);
	if (remaining.length === 1) editor.replaceBlocks([row], [remaining[0].children[0]]);
	else editor.replaceBlocks([row], [{ ...row, children: remaining }]);
};

const dropBeside = (
	editor: PostWriteBlockNoteEditor,
	source: DragSource,
	targetId: string,
	direction: 'left' | 'right',
): boolean => {
	if (source.kind !== 'standalone-image' && source.kind !== 'column-image') return false;
	if (source.blockId === targetId) return false;
	const sourceRow = findImageRow(editor, source.blockId);
	const sourceImage =
		sourceRow?.children.find((column) => column.children[0]?.id === source.blockId)?.children[0] ??
		editor.document.find((block) => block.id === source.blockId);
	if (!isPlainImage(sourceImage)) return false;

	const removeSource = () => {
		if (sourceRow !== undefined) removeFromRow(editor, sourceRow, source.blockId);
		else editor.removeBlocks([sourceImage]);
	};

	const targetRow = findImageRow(editor, targetId);
	if (targetRow !== undefined) {
		const targetIndex = targetRow.children.findIndex((column) => column.children[0]?.id === targetId);
		const insertIndex = direction === 'left' ? targetIndex : targetIndex + 1;
		if (sourceRow?.id === targetRow.id) {
			// 같은 이미지행 안의 순서 변경은 길이와 무관하며, 제자리면 아무것도 하지 않는다.
			const sourceIndex = targetRow.children.findIndex((column) => column.children[0]?.id === source.blockId);
			if (insertIndex === sourceIndex || insertIndex === sourceIndex + 1) return false;
			const sourceColumn = targetRow.children[sourceIndex];
			const columns = targetRow.children.filter((column) => column.id !== sourceColumn.id);
			columns.splice(insertIndex > sourceIndex ? insertIndex - 1 : insertIndex, 0, sourceColumn);
			editor.transact(() => {
				editor.updateBlock(targetRow, { children: columns });
			});
			return true;
		}
		if (targetRow.children.length >= MAX_IMAGE_ROW_COLUMNS) return false;
		editor.transact(() => {
			removeSource();
			editor.replaceBlocks(
				[targetRow],
				[
					{
						...targetRow,
						children: [
							...targetRow.children.slice(0, insertIndex),
							{ type: 'column', props: { width: 1 }, children: [sourceImage] },
							...targetRow.children.slice(insertIndex),
						],
					},
				],
			);
		});
		return true;
	}

	const target = editor.document.find((block) => block.id === targetId);
	if (!isPlainImage(target)) return false;
	const images = direction === 'left' ? [sourceImage, target] : [target, sourceImage];
	editor.transact(() => {
		removeSource();
		editor.replaceBlocks(
			[target],
			[
				{
					type: 'columnList',
					children: images.map((item) => ({ type: 'column', props: { width: 1 }, children: [item] })),
				},
			],
		);
	});
	return true;
};

const dropVertical = (
	editor: PostWriteBlockNoteEditor,
	source: DragSource,
	targetId: string,
	direction: 'top' | 'bottom',
): boolean => {
	const sourceIds = source.kind === 'multi' ? source.blockIds : [source.blockId];
	if (sourceIds.includes(targetId)) return false;
	const target = editor.document.find((block) => block.id === targetId);
	const sourceRow = source.kind === 'column-image' ? findImageRow(editor, source.blockId) : undefined;
	const movers = sourceIds
		.map((id) =>
			sourceRow === undefined
				? editor.getBlock(id)
				: sourceRow.children.find((column) => column.children[0]?.id === id)?.children[0],
		)
		.filter((block) => block !== undefined);
	if (target === undefined || movers.length !== sourceIds.length) return false;

	// 자신이 속한 2장 행의 위/아래로 놓으면 행이 풀리므로 남은 이미지를 기준으로 삼는다.
	const referenceId =
		sourceRow !== undefined && sourceRow.id === targetId && sourceRow.children.length === 2
			? (sourceRow.children.find((column) => column.children[0]?.id !== sourceIds[0])?.children[0]?.id ?? targetId)
			: targetId;

	editor.transact(() => {
		if (sourceRow !== undefined) removeFromRow(editor, sourceRow, sourceIds[0]);
		else editor.removeBlocks(movers);
		editor.insertBlocks(movers, referenceId, direction === 'top' ? 'before' : 'after');
	});
	return true;
};

/**
 * 판정된 드롭 위치를 문서에 반영한다. 이미지행의 생성·해체·이동은 하나의 트랜잭션이라 undo 한 번에 되돌아간다.
 * TODO(미정): undo/redo 묶음 단위는 기본값(전체를 한 트랜잭션)으로 처리했다.
 */
export const applyImageRowDrop = (editor: PostWriteBlockNoteEditor, source: DragSource, drop: DropPosition): boolean =>
	drop.direction === 'left' || drop.direction === 'right'
		? dropBeside(editor, source, drop.targetId, drop.direction)
		: dropVertical(editor, source, drop.targetId, drop.direction);
