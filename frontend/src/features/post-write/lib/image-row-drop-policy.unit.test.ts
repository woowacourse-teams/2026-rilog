import { describe, expect, it } from 'vitest';

import type { DragSource, DropLayout, DropRect } from './image-row-drop-policy';

import { resolveImageRowDrop } from './image-row-drop-policy';

const rect = (left: number, top: number, right: number, bottom: number): DropRect => ({ left, top, right, bottom });

// 에디터 x 100~400, 블록 높이 100씩. 25% 영역: 전체 폭 300 → 75px, 두 열(150px) → 37.5px, 세 열(100px) → 25px
const layout: DropLayout = {
	editor: rect(100, 0, 400, 600),
	blocks: [
		{ kind: 'other', id: 'p1', rect: rect(100, 0, 400, 100) },
		{ kind: 'image', id: 'img1', rect: rect(100, 100, 400, 200) },
		{
			kind: 'row',
			id: 'row2',
			rect: rect(100, 200, 400, 300),
			columns: [
				{ imageId: 'a', rect: rect(100, 200, 250, 300) },
				{ imageId: 'b', rect: rect(250, 200, 400, 300) },
			],
		},
		{ kind: 'other', id: 'p2', rect: rect(100, 300, 400, 400) },
		{
			kind: 'row',
			id: 'row3',
			rect: rect(100, 400, 400, 500),
			columns: [
				{ imageId: 'x', rect: rect(100, 400, 200, 500) },
				{ imageId: 'y', rect: rect(200, 400, 300, 500) },
				{ imageId: 'z', rect: rect(300, 400, 400, 500) },
			],
		},
		{ kind: 'image', id: 'img2', rect: rect(100, 500, 400, 600) },
	],
};

const standalone = (blockId: string): DragSource => ({ kind: 'standalone-image', blockId });
const columnImage = (blockId: string, rowId: string): DragSource => ({ kind: 'column-image', blockId, rowId });
const other = (blockId: string): DragSource => ({ kind: 'other', blockId });
const multi = (...blockIds: string[]): DragSource => ({ kind: 'multi', blockIds });

describe('resolveImageRowDrop 블록 내부', () => {
	it('위에서 60%는 위, 나머지 40%는 아래로 판정한다', () => {
		expect(resolveImageRowDrop(250, 359, other('zz'), layout)).toEqual({
			targetId: 'p2',
			direction: 'top',
			insertIndex: 3,
		});
		expect(resolveImageRowDrop(250, 360, other('zz'), layout)).toEqual({
			targetId: 'p2',
			direction: 'bottom',
			insertIndex: 4,
		});
	});

	it('그 외 블록은 좌우 25% 영역에서 가이드선이 없고 상하로 폴백하지 않는다', () => {
		expect(resolveImageRowDrop(110, 320, standalone('img1'), layout)).toBeNull();
		expect(resolveImageRowDrop(390, 320, standalone('img1'), layout)).toBeNull();
		expect(resolveImageRowDrop(176, 320, standalone('img1'), layout)).not.toBeNull();
	});

	it('단독 이미지 좌우에는 단독/열 이미지만 놓을 수 있다', () => {
		expect(resolveImageRowDrop(110, 150, standalone('img2'), layout)).toEqual({
			targetId: 'img1',
			direction: 'left',
			insertIndex: 0,
		});
		expect(resolveImageRowDrop(390, 150, columnImage('x', 'row3'), layout)).toEqual({
			targetId: 'img1',
			direction: 'right',
			insertIndex: 1,
		});
		expect(resolveImageRowDrop(110, 150, other('p2'), layout)).toBeNull();
		expect(resolveImageRowDrop(110, 150, multi('p1', 'p2'), layout)).toBeNull();
		expect(resolveImageRowDrop(110, 150, standalone('img1'), layout)).toBeNull();
	});

	it('이미지행은 좌우를 내부 열 이미지 한 칸 너비 기준으로 위임한다', () => {
		expect(resolveImageRowDrop(120, 250, standalone('img2'), layout)).toEqual({
			targetId: 'a',
			direction: 'left',
			insertIndex: 0,
		});
		// 두 번째 열의 왼쪽 영역은 첫 열 오른쪽과 같은 삽입 경계지만 대상은 b다.
		expect(resolveImageRowDrop(260, 250, standalone('img2'), layout)).toEqual({
			targetId: 'b',
			direction: 'left',
			insertIndex: 1,
		});
		// 열 너비의 25% 바로 바깥은 상하 판정이다.
		expect(resolveImageRowDrop(100 + 38, 250, standalone('img2'), layout)?.direction).toBe('top');
	});

	it('열 이미지 위의 상하 판정은 부모 이미지행 전체 기준으로 위임한다', () => {
		expect(resolveImageRowDrop(175, 259, other('p1'), layout)).toEqual({
			targetId: 'row2',
			direction: 'top',
			insertIndex: 2,
		});
		expect(resolveImageRowDrop(325, 260, other('p1'), layout)).toEqual({
			targetId: 'row2',
			direction: 'bottom',
			insertIndex: 3,
		});
	});

	it('이미지행이 3장이면 다른 소스는 좌우로 놓을 수 없다', () => {
		expect(resolveImageRowDrop(110, 450, standalone('img1'), layout)).toBeNull();
		expect(resolveImageRowDrop(390, 450, columnImage('a', 'row2'), layout)).toBeNull();
	});

	it('같은 이미지행의 순서 변경은 3장이어도 가능하지만 제자리는 가이드선이 없다', () => {
		expect(resolveImageRowDrop(310, 450, columnImage('x', 'row3'), layout)).toEqual({
			targetId: 'z',
			direction: 'left',
			insertIndex: 2,
		});
		expect(resolveImageRowDrop(210, 450, columnImage('x', 'row3'), layout)).toBeNull();
		expect(resolveImageRowDrop(110, 450, columnImage('x', 'row3'), layout)).toBeNull();
		expect(resolveImageRowDrop(190, 450, columnImage('x', 'row3'), layout)).toBeNull();
		expect(resolveImageRowDrop(190, 450, columnImage('z', 'row3'), layout)).toEqual({
			targetId: 'x',
			direction: 'right',
			insertIndex: 1,
		});
	});

	it('다른 행의 열 이미지는 대상 이미지행이 3장 미만일 때만 받는다', () => {
		expect(resolveImageRowDrop(390, 250, columnImage('x', 'row3'), layout)).toEqual({
			targetId: 'b',
			direction: 'right',
			insertIndex: 2,
		});
		expect(resolveImageRowDrop(110, 250, columnImage('b', 'row2'), layout)).toEqual({
			targetId: 'a',
			direction: 'left',
			insertIndex: 0,
		});
	});

	it('다중 선택은 상하만 가능하다', () => {
		expect(resolveImageRowDrop(250, 120, multi('p1', 'p2'), layout)).toEqual({
			targetId: 'img1',
			direction: 'top',
			insertIndex: 1,
		});
	});
});

describe('resolveImageRowDrop 제자리', () => {
	it('자기 자신과 바로 인접한 상하 위치는 가이드선이 없다', () => {
		expect(resolveImageRowDrop(250, 60, other('p1'), layout)).toBeNull();
		expect(resolveImageRowDrop(250, 350, other('p2'), layout)).toBeNull();
		// p2 바로 아래 = row3 위
		expect(resolveImageRowDrop(250, 410, other('p2'), layout)).toBeNull();
		// p2 바로 위 = row2 아래
		expect(resolveImageRowDrop(175, 290, other('p2'), layout)).toBeNull();
		expect(resolveImageRowDrop(250, 410, other('p1'), layout)).not.toBeNull();
	});

	it('연속 다중 선택 범위 안쪽과 경계도 제자리다', () => {
		expect(resolveImageRowDrop(250, 120, multi('p1', 'img1'), layout)).toBeNull();
		expect(resolveImageRowDrop(250, 180, multi('p1', 'img1'), layout)).toBeNull();
		expect(resolveImageRowDrop(175, 220, multi('p1', 'img1'), layout)).toBeNull();
		expect(resolveImageRowDrop(250, 320, multi('p1', 'img1'), layout)).not.toBeNull();
	});

	it('열 이미지를 자기 이미지행의 위/아래에 놓으면 행에서 빠지는 이동이라 가능하다', () => {
		expect(resolveImageRowDrop(175, 220, columnImage('a', 'row2'), layout)).toEqual({
			targetId: 'row2',
			direction: 'top',
			insertIndex: 2,
		});
	});
});

describe('resolveImageRowDrop 블록 외부', () => {
	it('좌우 바깥은 같은 높이 블록의 가장자리로 판정한다', () => {
		expect(resolveImageRowDrop(60, 250, standalone('img2'), layout)).toEqual({
			targetId: 'a',
			direction: 'left',
			insertIndex: 0,
		});
		expect(resolveImageRowDrop(440, 250, standalone('img2'), layout)).toEqual({
			targetId: 'b',
			direction: 'right',
			insertIndex: 2,
		});
		expect(resolveImageRowDrop(60, 150, standalone('img2'), layout)).toEqual({
			targetId: 'img1',
			direction: 'left',
			insertIndex: 0,
		});
	});

	it('좌우 바깥에서 그 외 블록 높이이거나 X 조합이면 가이드선이 없다', () => {
		expect(resolveImageRowDrop(60, 50, standalone('img2'), layout)).toBeNull();
		expect(resolveImageRowDrop(60, 150, other('p1'), layout)).toBeNull();
		expect(resolveImageRowDrop(440, 450, standalone('img1'), layout)).toBeNull();
	});

	it('에디터 바깥 100px를 넘으면 인식하지 않는다', () => {
		expect(resolveImageRowDrop(-1, 250, standalone('img2'), layout)).toBeNull();
		expect(resolveImageRowDrop(501, 250, standalone('img2'), layout)).toBeNull();
		expect(resolveImageRowDrop(250, 701, other('p1'), layout)).toBeNull();
		expect(resolveImageRowDrop(250, -101, other('p2'), layout)).toBeNull();
	});

	it('상하 바깥은 좌우 판정 없이 첫 블록의 위, 마지막 블록의 아래로 판정한다', () => {
		expect(resolveImageRowDrop(110, -50, other('p2'), layout)).toEqual({
			targetId: 'p1',
			direction: 'top',
			insertIndex: 0,
		});
		expect(resolveImageRowDrop(60, 650, other('p2'), layout)).toEqual({
			targetId: 'img2',
			direction: 'bottom',
			insertIndex: 6,
		});
		expect(resolveImageRowDrop(250, 650, other('img2'), layout)).toBeNull();
	});

	it('블록 사이 간격은 가장 가까운 경계의 상하로만 판정한다', () => {
		const gapped: DropLayout = {
			editor: rect(100, 0, 400, 300),
			blocks: [
				{ kind: 'other', id: 'g1', rect: rect(100, 0, 400, 100) },
				{ kind: 'other', id: 'g2', rect: rect(100, 120, 400, 220) },
			],
		};
		expect(resolveImageRowDrop(110, 110, other('zz'), gapped)).toEqual({
			targetId: 'g1',
			direction: 'bottom',
			insertIndex: 1,
		});
		expect(resolveImageRowDrop(250, 260, other('zz'), gapped)).toEqual({
			targetId: 'g2',
			direction: 'bottom',
			insertIndex: 2,
		});
	});
});
