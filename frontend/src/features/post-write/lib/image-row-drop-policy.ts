/**
 * 이미지 가로 배치 드롭 판정 (순수 함수).
 * 입력 좌표, 소스 종류와 레이아웃만으로 드롭 위치를 정하며 DOM과 에디터 상태를 읽지 않는다.
 */

export const MAX_IMAGE_ROW_COLUMNS = 3;
/** 좌우 판정 영역: 대상 요소 너비의 좌/우 25%. */
export const SIDE_ZONE_RATIO = 0.25;
/** 위 판정 영역: 대상 요소 높이의 위쪽 60%. */
export const TOP_ZONE_RATIO = 0.6;
/** 에디터 바깥에서도 드롭을 인식하는 범위(px). */
export const EDITOR_OUTSIDE_RANGE = 100;

export type DropDirection = 'top' | 'bottom' | 'left' | 'right';

export interface DropRect {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

export type DragSource =
	| { kind: 'standalone-image'; blockId: string }
	| { kind: 'column-image'; blockId: string; rowId: string }
	| { kind: 'other'; blockId: string }
	| { kind: 'multi'; blockIds: string[] };

export interface DropLayoutColumn {
	/** 열 안의 이미지 블록 id */
	imageId: string;
	/** 열 이미지 한 칸의 영역 */
	rect: DropRect;
}

/** 최상위 블록 하나. 중첩 블록은 레이아웃에 넣지 않는다. */
export type DropLayoutBlock =
	| { kind: 'image'; id: string; rect: DropRect }
	| { kind: 'row'; id: string; rect: DropRect; columns: DropLayoutColumn[] }
	| { kind: 'other'; id: string; rect: DropRect };

export interface DropLayout {
	editor: DropRect;
	/** 문서 순서대로 정렬된 최상위 블록 */
	blocks: DropLayoutBlock[];
}

export interface DropPosition {
	/** top/bottom: 최상위 블록(이미지행 포함), left/right: 이미지 블록(단독 또는 열 이미지) */
	targetId: string;
	direction: DropDirection;
	/**
	 * top/bottom: 최상위 블록 기준 삽입 인덱스(제거 전 기준).
	 * left/right: 이미지행 안의 삽입 인덱스(단독 이미지 대상이면 left=0, right=1).
	 */
	insertIndex: number;
}

const getSourceIds = (source: DragSource): string[] => (source.kind === 'multi' ? source.blockIds : [source.blockId]);

/** 좌우 드롭 가능 여부(8장 표). 대상이 이미지행이면 호출 전에 열 이미지로 위임된 상태다. */
const canDropBeside = (
	source: DragSource,
	target: { imageId: string; row: Extract<DropLayoutBlock, { kind: 'row' }> | null },
): boolean => {
	if (source.kind === 'other' || source.kind === 'multi') return false;
	if (source.blockId === target.imageId) return false;
	if (target.row === null) return true;
	// 같은 이미지행 안의 순서 변경은 길이와 무관하다.
	if (source.kind === 'column-image' && source.rowId === target.row.id) return true;
	return target.row.columns.length < MAX_IMAGE_ROW_COLUMNS;
};

const resolveHorizontal = (
	source: DragSource,
	block: DropLayoutBlock,
	direction: 'left' | 'right',
	column: DropLayoutColumn | null,
): DropPosition | null => {
	if (block.kind === 'other') return null;
	if (block.kind === 'image') {
		if (!canDropBeside(source, { imageId: block.id, row: null })) return null;
		return { targetId: block.id, direction, insertIndex: direction === 'left' ? 0 : 1 };
	}
	if (column === null) return null;
	if (!canDropBeside(source, { imageId: column.imageId, row: block })) return null;
	const columnIndex = block.columns.findIndex((candidate) => candidate.imageId === column.imageId);
	if (columnIndex < 0) return null;
	if (source.kind === 'column-image' && source.rowId === block.id) {
		const sourceIndex = block.columns.findIndex((candidate) => candidate.imageId === source.blockId);
		// 제자리(바로 옆)는 no-op이다.
		// TODO(미정): 제자리 드롭 정책이 확정되면 가이드선 표시 여부를 다시 결정한다.
		if (direction === 'left' ? sourceIndex === columnIndex - 1 : sourceIndex === columnIndex + 1) return null;
	}
	return { targetId: column.imageId, direction, insertIndex: direction === 'left' ? columnIndex : columnIndex + 1 };
};

const resolveVertical = (
	source: DragSource,
	layout: DropLayout,
	blockIndex: number,
	direction: 'top' | 'bottom',
): DropPosition | null => {
	const block = layout.blocks[blockIndex];
	const sourceIds = getSourceIds(source);
	if (sourceIds.includes(block.id)) return null;

	const insertIndex = direction === 'top' ? blockIndex : blockIndex + 1;
	const sourceIndexes = sourceIds
		.map((id) => layout.blocks.findIndex((candidate) => candidate.id === id))
		.filter((index) => index >= 0);
	// 최상위 블록이 모두 연속해 있고 삽입 위치가 그 범위 안이면 순서가 바뀌지 않는다(제자리).
	// TODO(미정): 제자리 드롭 정책이 확정되면 가이드선 표시 여부를 다시 결정한다.
	if (sourceIndexes.length === sourceIds.length && sourceIndexes.length > 0) {
		const min = Math.min(...sourceIndexes);
		const max = Math.max(...sourceIndexes);
		if (max - min + 1 === sourceIndexes.length && insertIndex >= min && insertIndex <= max + 1) return null;
	}
	return { targetId: block.id, direction, insertIndex };
};

const isInside = (rect: DropRect, x: number, y: number) =>
	x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

const getRatio = (start: number, size: number, value: number) => (size <= 0 ? 0 : (value - start) / size);

/**
 * 커서 위치에서 드롭 가능한 위치를 판정한다. null이면 가이드선을 표시하지 않고 드롭을 막는다.
 * 순서: 에디터 바깥 > 좌우(25%) > 상하(위 60% / 아래 40%). 좌우가 X여도 상하로 폴백하지 않는다.
 */
export const resolveImageRowDrop = (
	x: number,
	y: number,
	source: DragSource,
	layout: DropLayout,
): DropPosition | null => {
	const { editor, blocks } = layout;
	if (blocks.length === 0 || !Number.isFinite(x) || !Number.isFinite(y)) return null;
	if (
		x < editor.left - EDITOR_OUTSIDE_RANGE ||
		x > editor.right + EDITOR_OUTSIDE_RANGE ||
		y < editor.top - EDITOR_OUTSIDE_RANGE ||
		y > editor.bottom + EDITOR_OUTSIDE_RANGE
	)
		return null;

	// 상하 바깥: 좌우 판정 없이 첫 블록의 위/마지막 블록의 아래.
	if (y < editor.top) return resolveVertical(source, layout, 0, 'top');
	if (y > editor.bottom) return resolveVertical(source, layout, blocks.length - 1, 'bottom');

	const blockIndex = blocks.findIndex((candidate) => y >= candidate.rect.top && y <= candidate.rect.bottom);
	if (blockIndex < 0) {
		// 블록 사이 간격: 블록노트 기본 동작을 호출할 수 없으므로 가장 가까운 경계에 상하 판정만 적용한다.
		// TODO(미정): 간격에서 블록노트 기본 드롭 위치와 완전히 일치시킨다.
		if (x < editor.left || x > editor.right) return null;
		const nextIndex = blocks.findIndex((candidate) => y < candidate.rect.top);
		if (nextIndex === 0) return resolveVertical(source, layout, 0, 'top');
		if (nextIndex < 0) return resolveVertical(source, layout, blocks.length - 1, 'bottom');
		return resolveVertical(source, layout, nextIndex - 1, 'bottom');
	}
	const block = blocks[blockIndex];

	// 좌우 바깥: 같은 높이 블록의 좌/우 가장자리로 간주한다.
	if (x < editor.left || x > editor.right) {
		const direction = x < editor.left ? 'left' : 'right';
		if (block.kind === 'row') {
			const column = direction === 'left' ? block.columns[0] : block.columns[block.columns.length - 1];
			return resolveHorizontal(source, block, direction, column ?? null);
		}
		return resolveHorizontal(source, block, direction, null);
	}

	// 열 이미지는 부모 이미지행의 한 칸 너비를 기준으로 좌우를 판정한다.
	let column: DropLayoutColumn | null = null;
	let zone: DropRect = block.rect;
	if (block.kind === 'row') {
		const hit = block.columns.find((candidate) => isInside(candidate.rect, x, y));
		// TODO(미정): 열 사이 간격에서는 가장 가까운 열을 대상으로 삼는다.
		column =
			hit ??
			block.columns.reduce<DropLayoutColumn | null>((nearest, candidate) => {
				const distance = Math.min(Math.abs(x - candidate.rect.left), Math.abs(x - candidate.rect.right));
				if (nearest === null) return candidate;
				const nearestDistance = Math.min(Math.abs(x - nearest.rect.left), Math.abs(x - nearest.rect.right));
				return distance < nearestDistance ? candidate : nearest;
			}, null);
		if (column !== null) zone = column.rect;
	}
	const width = zone.right - zone.left;
	if (width > 0) {
		if (x <= zone.left + width * SIDE_ZONE_RATIO) return resolveHorizontal(source, block, 'left', column);
		if (x >= zone.right - width * SIDE_ZONE_RATIO) return resolveHorizontal(source, block, 'right', column);
	}

	const direction = getRatio(block.rect.top, block.rect.bottom - block.rect.top, y) < TOP_ZONE_RATIO ? 'top' : 'bottom';
	return resolveVertical(source, layout, blockIndex, direction);
};
