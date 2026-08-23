import { describe, expect, it } from 'vitest';

import { calculateSlashMenuLayout, clampSlashMenuCoordinate } from './calculate-slash-menu-layout';

const VIEWPORT = {
	left: 0,
	top: 0,
	right: 600,
	bottom: 800,
	width: 600,
	height: 800,
};

describe('calculateSlashMenuLayout', () => {
	it('메뉴를 표시할 공간이 충분하면 커서 아래에 배치한다', () => {
		const layout = calculateSlashMenuLayout({
			boundary: VIEWPORT,
			menuHeight: 320,
			reference: { top: 120, bottom: 144 },
		});

		expect(layout).toEqual({ placement: 'bottom-start', maxHeight: 630, maxWidth: 568 });
	});

	it('아래 공간이 메뉴 높이와 조기 반전 여유보다 작으면 위에 배치한다', () => {
		const layout = calculateSlashMenuLayout({
			boundary: VIEWPORT,
			menuHeight: 320,
			reference: { top: 560, bottom: 584 },
		});

		expect(layout).toEqual({ placement: 'top-start', maxHeight: 534, maxWidth: 568 });
	});

	it('양쪽 공간이 부족하면 더 넓은 방향을 선택하고 메뉴 높이를 제한한다', () => {
		const layout = calculateSlashMenuLayout({
			boundary: { ...VIEWPORT, bottom: 400, height: 400 },
			menuHeight: 320,
			reference: { top: 180, bottom: 204 },
		});

		expect(layout).toEqual({ placement: 'bottom-start', maxHeight: 170, maxWidth: 568 });
	});
});

describe('clampSlashMenuCoordinate', () => {
	it('경계 바깥 좌표를 안전한 범위로 제한한다', () => {
		expect(clampSlashMenuCoordinate(-24, 16, 480)).toBe(16);
		expect(clampSlashMenuCoordinate(520, 16, 480)).toBe(480);
		expect(clampSlashMenuCoordinate(240, 16, 480)).toBe(240);
	});
});
