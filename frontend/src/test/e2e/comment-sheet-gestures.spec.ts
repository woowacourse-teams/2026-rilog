import { expect, test } from '@playwright/test';

import type { Locator, Page } from '@playwright/test';

import { renderInlineCommentWorkspace } from './fixtures/inline-comment-browser';

const errors = new WeakMap<Page, string[]>();
const group = {
	selectionId: 91,
	blockId: 'block-1',
	range: { startOffset: 0, endOffset: 5 },
	selectedText: '브라우저에서',
	state: 'ACTIVE',
	anchorCount: 1,
	commentAnchors: [
		{
			commentAnchorId: 991,
			content: '스크롤하며 읽는 긴 댓글 본문입니다. '.repeat(160),
			author: {
				userId: 1,
				nickname: '댓글 작성자',
				slug: 'author',
				profileImageUrl: null,
				isPostAuthor: false,
				isBlogMember: false,
			},
			canEdit: false,
			canDelete: false,
			isEdited: false,
			createdAt: '2026-10-26T00:00:00',
			updatedAt: '2026-10-26T00:00:00',
		},
	],
};

test.beforeEach(async ({ page }) => {
	const pageErrors: string[] = [];
	errors.set(page, pageErrors);
	page.on('pageerror', (error) => pageErrors.push(error.message));
	await page.route('**/v1/**', (route) => route.abort());
	await page.route('**/v1/posts/106/comment-anchors{,/sidebar}', (route) =>
		route.fulfill({
			json: {
				status: 0,
				message: 'OK',
				data: route.request().url().endsWith('/sidebar')
					? { anchorGroups: [group] }
					: { blocks: [{ blockId: 'block-1', anchorGroups: [group] }] },
			},
		}),
	);
});

test.afterEach(({ page }) => expect(errors.get(page) ?? []).toEqual([]));

const settle = async (dialog: Locator) => {
	await dialog.evaluate(async (element) => {
		element.getBoundingClientRect();
		await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
	});
};

const openSheet = async (page: Page) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await renderInlineCommentWorkspace(page, 91);
	const dialog = page.getByRole('dialog', { name: '인라인 댓글 1', exact: true });
	await expect(dialog).toHaveAttribute('data-state', 'open');
	await expect(dialog.getByRole('article', { name: '댓글 작성자님의 댓글' })).toBeVisible();
	await settle(dialog);
	return dialog;
};

const drag = async (page: Page, target: Locator, dy: number, dx = 0) => {
	const box = await target.boundingBox();
	if (!box) throw new Error('드래그 대상이 없습니다.');
	const x = box.x + box.width / 2;
	const y = box.y + Math.min(box.height / 2, 120);
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x + dx, y + dy, { steps: 10 });
	await page.mouse.up();
};

const expectExpanded = async (page: Page, expanded: boolean) => {
	await expect(page.getByRole('button', { name: expanded ? '댓글창 축소' : '댓글창 확장' })).toHaveAttribute(
		'aria-expanded',
		String(expanded),
	);
};

test('제목 영역을 올려 확장하고 목록 상단을 내려 축소·닫기한다', async ({ page }) => {
	let dialog = await openSheet(page);
	await drag(page, dialog.getByRole('heading', { name: '인라인 댓글 1' }), -100);
	await expectExpanded(page, true);
	await settle(dialog);
	await drag(page, dialog.locator('[data-comment-list]'), 100);
	await expectExpanded(page, false);
	await settle(dialog);
	await drag(page, dialog.locator('[data-comment-list]'), 120);
	await expect(dialog).toBeHidden();
	await page.getByRole('button', { name: '전체 댓글 1개 보기' }).click();
	dialog = page.getByRole('dialog', { name: '전체 인라인 댓글 1', exact: true });
	await expect(dialog).toHaveAttribute('data-state', 'open');
	await settle(dialog);
	const handle = page.getByRole('button', { name: /댓글창 (확장|축소)/ });
	await drag(page, handle, -100);
	await expectExpanded(page, true);
	await expect.poll(async () => (await dialog.boundingBox())?.height ?? 0).toBeGreaterThan(844 * 0.9);
	await settle(dialog);
	const expandedHeight = (await dialog.boundingBox())?.height ?? 0;
	await drag(page, dialog.locator('[data-comment-list]'), 100);
	await expectExpanded(page, false);
	await expect
		.poll(async () => (await dialog.boundingBox())?.height ?? 0)
		.toBeLessThan(Math.min(expandedHeight, 844 * 0.75));
	await settle(dialog);
	await drag(page, handle, 100);
	await expect(dialog).toBeHidden();
	await expect(page).toHaveURL(/\/about$/);
});

test('축소된 목록을 올리면 먼저 시트를 확장하고 수평 드래그는 무시한다', async ({ page }) => {
	const dialog = await openSheet(page);
	const list = dialog.locator('[data-comment-list]');
	await list.hover();
	await page.mouse.wheel(0, 300);
	await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(100);
	await drag(page, list, 100);
	await expect(dialog).toBeVisible();
	await expectExpanded(page, false);
	await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
	await list.evaluate((element) => {
		element.scrollTop = 0;
	});
	await drag(page, list, 0, 100);
	await expectExpanded(page, false);
	await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBe(0);
	await drag(page, list, -120);
	await expectExpanded(page, true);
	await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBe(0);
});

test('확장된 댓글 목록의 기본 스크롤은 시트 높이를 바꾸지 않는다', async ({ page }) => {
	const dialog = await openSheet(page);
	await page.getByRole('button', { name: '댓글창 확장' }).click();
	await expectExpanded(page, true);
	await settle(dialog);
	const list = dialog.locator('[data-comment-list]');
	const before = await dialog.boundingBox();
	await list.hover();
	await page.mouse.wheel(0, 300);
	await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(100);
	await drag(page, list, 100);
	await expectExpanded(page, true);
	await settle(dialog);
	const after = await dialog.boundingBox();
	if (!before || !after) throw new Error('시트 위치가 없습니다.');
	expect(after.y).toBeCloseTo(before.y, 0);
	expect(after.height).toBeCloseTo(before.height, 0);
	await list.hover();
	await page.mouse.wheel(0, -80);
	await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeLessThan(300);
});

test('링크·버튼과 입력창에서 시작한 제스처는 시트를 잡지 않는다', async ({ page }) => {
	const dialog = await openSheet(page);
	const before = await dialog.boundingBox();
	await drag(page, dialog.getByRole('link', { name: '댓글 작성자', exact: true }), 100);
	await expectExpanded(page, false);
	await drag(page, dialog.getByRole('button', { name: '댓글 추가: 브라우저에서', exact: true }), 100);
	await expectExpanded(page, false);
	const input = dialog.getByRole('textbox', { name: '댓글 입력' });
	await input.fill('입력창은 계속 사용할 수 있습니다.');
	await drag(page, input, -90);
	await expect(input).toHaveValue('입력창은 계속 사용할 수 있습니다.');
	await expectExpanded(page, false);
	const after = await dialog.boundingBox();
	if (!before || !after) throw new Error('시트 위치가 없습니다.');
	expect(after.height).toBeCloseTo(before.height, 0);
});

for (const width of [390, 1440]) {
	test(`${width}px 댓글 입력과 재진입은 초안을 유지하고 목록을 처음부터 보여준다`, async ({ page }) => {
		await page.setViewportSize({ width, height: 844 });
		await renderInlineCommentWorkspace(page, 91);
		const composer = page.getByRole('group', { name: '댓글 입력 및 작성', exact: true });
		const input = composer.getByRole('textbox', { name: '댓글 입력' });
		await input.fill('첫째 줄\n둘째 줄\n셋째 줄\n넷째 줄\n다섯째 줄');
		const submit = composer.getByRole('button', { name: '작성', exact: true });
		await expect(submit).toBeEnabled();
		if (width < 1280) {
			const dialog = page.getByRole('dialog', { name: '인라인 댓글 1', exact: true });
			await expect(dialog).toHaveAttribute('data-state', 'open');
			await settle(dialog);
		}
		// Static containment uses settled geometry; entering keyboard visibility has its own regression.
		// Sample controls together so their relative bounds share the same layout.
		const { outer, text, button } = await composer.evaluate((element) => {
			const inputElement = element.querySelector('textarea');
			const submitElement = element.querySelector('button');
			if (!inputElement || !submitElement) throw new Error('댓글 입력 그룹이 없습니다.');
			const box = (node: Element) => {
				const rect = node.getBoundingClientRect();
				return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
			};
			return { outer: box(element), text: box(inputElement), button: box(submitElement) };
		});
		// Firefox can round equal DOMRect edges differently by a fraction of a CSS pixel.
		const coordinatePrecision = 1 / 1024;
		for (const control of [text, button]) {
			expect(control.x).toBeGreaterThanOrEqual(outer.x - coordinatePrecision);
			expect(control.y).toBeGreaterThanOrEqual(outer.y - coordinatePrecision);
			expect(control.x + control.width).toBeLessThanOrEqual(outer.x + outer.width + coordinatePrecision);
			expect(control.y + control.height).toBeLessThanOrEqual(outer.y + outer.height + coordinatePrecision);
		}
		expect(button.x).toBeGreaterThan(text.x + text.width);
		const border = await input.evaluate((element) => ({
			input: parseFloat(getComputedStyle(element).borderRightWidth),
			group: parseFloat(getComputedStyle(element.closest('[role=group]')!).borderRightWidth),
		}));
		expect(border.input).toBeGreaterThan(0);
		expect(border.group).toBe(0);
		expect(button.height).toBeGreaterThanOrEqual(44);
		await expect.poll(() => input.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
		const list = page.locator('[data-comment-list]');
		for (let attempt = 0; attempt < 2; attempt += 1) {
			await list.evaluate((element) => {
				element.scrollTop = 300;
			});
			await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(100);
			if (width < 768) {
				await page.keyboard.press('Escape');
				await expect(page.getByRole('dialog')).toBeHidden();
			} else {
				await page.getByRole('button', { name: '댓글 사이드바 닫기', exact: true }).click();
			}
			await page.getByRole('button', { name: /전체 댓글 \d+개 보기/ }).click();
			await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBe(0);
			if (width < 768) {
				await expect(input).toHaveCount(0);
				await page.getByRole('button', { name: '댓글 추가: 브라우저에서', exact: true }).click();
			}
			await expect(input).toHaveValue('첫째 줄\n둘째 줄\n셋째 줄\n넷째 줄\n다섯째 줄');
		}
	});
}

test('실제 터치에서도 목록 스크롤을 유지하고 최상단 내리기만 시트를 축소한다', async ({ page, browserName }) => {
	test.skip(
		browserName !== 'chromium',
		'실제 터치 주입은 Chromium CDP에서 제공한다. 다른 엔진은 공통 포인터와 wheel로 검증한다.',
	);
	const dialog = await openSheet(page);
	await page.getByRole('button', { name: '댓글창 확장' }).click();
	await expectExpanded(page, true);
	await settle(dialog);
	const list = dialog.locator('[data-comment-list]');
	const session = await page.context().newCDPSession(page);
	const touchDrag = async (dy: number) => {
		const box = await list.boundingBox();
		if (!box) throw new Error('댓글 목록이 없습니다.');
		const x = box.x + box.width / 2;
		const y = box.y + box.height / 2;
		await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
		for (let step = 1; step <= 12; step += 1) {
			await session.send('Input.dispatchTouchEvent', {
				type: 'touchMove',
				touchPoints: [{ x, y: y + (dy * step) / 12 }],
			});
			await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
		}
		await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
	};
	try {
		await Promise.all([
			list.evaluate(
				(element) =>
					new Promise<void>((resolve) => {
						element.addEventListener('scrollend', () => resolve(), { once: true });
					}),
			),
			touchDrag(-180),
		]);
		await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBeGreaterThan(50);
		await expectExpanded(page, true);
		await list.evaluate((element) => {
			element.scrollTop = 80;
		});
		await Promise.all([
			list.evaluate(
				(element) =>
					new Promise<void>((resolve) => {
						element.addEventListener('scrollend', () => resolve(), { once: true });
					}),
			),
			touchDrag(180),
		]);
		await expect.poll(() => list.evaluate((element) => element.scrollTop)).toBe(0);
		await expectExpanded(page, true);
		await touchDrag(120);
		await expectExpanded(page, false);
	} finally {
		await session.detach();
	}
});
