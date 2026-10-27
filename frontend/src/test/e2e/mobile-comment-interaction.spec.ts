import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import type { PostCommentAnchorResponse, PostCommentAnchorSidebarGroupResponse } from '@/shared/api/posts/types';

import { renderInlineCommentWorkspace } from './fixtures/inline-comment-browser';

const createComposerThreadGroup = (
	selectionId: number,
	selectedText: string,
	startOffset: number,
	commentOverrides: Partial<PostCommentAnchorResponse> = {},
): PostCommentAnchorSidebarGroupResponse => ({
	selectionId,
	blockId: 'block-1',
	range: { startOffset, endOffset: startOffset + selectedText.length },
	selectedText,
	state: 'ACTIVE',
	anchorCount: 1,
	commentAnchors: [
		{
			commentAnchorId: 900 + selectionId,
			content: `${selectedText}에 남긴 기존 댓글입니다. `.repeat(120),
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
			...commentOverrides,
		},
	],
});

const mockThreadGroups = (page: Page, groups: readonly PostCommentAnchorSidebarGroupResponse[]) =>
	page.route('**/v1/posts/106/comment-anchors{,/sidebar}', (route) =>
		route.fulfill({
			json: {
				status: 0,
				message: 'OK',
				data: route.request().url().endsWith('/sidebar')
					? { anchorGroups: groups }
					: { blocks: groups.length ? [{ blockId: 'block-1', anchorGroups: groups }] : [] },
			},
		}),
	);

const runtimeErrors = new WeakMap<Page, string[]>();

test.beforeEach(async ({ page }) => {
	const errors: string[] = [];
	runtimeErrors.set(page, errors);
	page.on('pageerror', (error) => errors.push(error.message));
	await page.route('**/about?previous=1', (route) =>
		route.fulfill({ contentType: 'text/html', body: '<p>이전 페이지</p>' }),
	);
	await page.route('**/v1/**', (route) => route.abort());
	await mockThreadGroups(page, []);
});

test.afterEach(({ page }) => {
	expect(runtimeErrors.get(page) ?? []).toEqual([]);
});

for (const width of [390, 1100, 1440]) {
	test(`${width}px 댓글창은 뒤로가기로 닫고 앞으로가기로 복원한다`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		await page.goto('/about?previous=1');
		await renderInlineCommentWorkspace(page);
		const comments = page.getByRole(width >= 1280 ? 'region' : 'dialog', { name: '전체 인라인 댓글 0', exact: true });
		await page.getByRole('button', { name: '전체 댓글 0개 보기' }).click();
		await expect(comments).toBeVisible();
		await page.goBack();
		await expect(page).toHaveURL(/\/about$/);
		await expect(comments).toBeHidden();
		await page.goForward();
		await expect(comments).toBeVisible();
		if (width < 768) await page.mouse.click(8, 8);
		else await page.getByRole('button', { name: /댓글.*닫기/ }).click();
		await expect(comments).toBeHidden();
		await page.goBack();
		await expect(page).toHaveURL(/\/about\?previous=1$/);
	});
}

test('댓글 직접 링크에서도 뒤로가기는 같은 상세 화면에 머물며 닫는다', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/about?previous=1');
	await renderInlineCommentWorkspace(page, 91);
	const comments = page.getByRole('dialog', { name: '인라인 댓글 0', exact: true });
	await expect(comments).toBeVisible();
	await page.goBack();
	await expect(page).toHaveURL(/\/about$/);
	await expect(comments).toBeHidden();
	await page.goBack();
	await expect(page).toHaveURL(/\/about\?previous=1$/);
});

test('댓글창을 반복해서 열고 닫아도 이전 페이지까지 빈 이력이 쌓이지 않는다', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/about?previous=1');
	await renderInlineCommentWorkspace(page);
	for (let index = 0; index < 3; index += 1) {
		await page.getByRole('button', { name: '전체 댓글 0개 보기' }).click();
		await expect(page.getByRole('dialog', { name: '전체 인라인 댓글 0' })).toBeVisible();
		await page.mouse.click(8, 8);
		await expect(page.getByRole('dialog', { name: '전체 인라인 댓글 0' })).toBeHidden();
	}
	await page.goBack();
	await expect(page).toHaveURL(/\/about\?previous=1$/);
});

// Selection API models the browser's selection changes, not physical OS long-press UI.
const selectNativeRange = async (page: Page, start = 0, end = 5) =>
	page.locator('[data-inline-comment-block-id="block-1"]').evaluate(
		(element, offsets) => {
			const node = element.firstChild;
			if (!node) throw new Error('본문이 없습니다.');
			const range = document.createRange();
			range.setStart(node, offsets.start);
			range.setEnd(node, offsets.end);
			window.getSelection()?.removeAllRanges();
			window.getSelection()?.addRange(range);
			document.dispatchEvent(new Event('selectionchange'));
			return range.toString();
		},
		{ start, end },
	);

test('모바일 native 선택 변경은 pointerup 없이 댓글 추가를 열고 최신 인용문과 초안을 보존한다', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await renderInlineCommentWorkspace(page);
	const root = page.locator('[data-inline-comment-block-id="block-1"]');
	await root.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 1, bubbles: true });
	await root.dispatchEvent('pointercancel', { pointerType: 'touch', pointerId: 1, bubbles: true });
	await selectNativeRange(page);
	const action = page.getByRole('button', { name: '댓글 추가', exact: true });
	await expect(action).toBeVisible();
	await expect(action).toHaveText('댓글 추가');
	await expect(page.getByRole('region', { name: '댓글 선택 모드' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: '댓글 작성', exact: true })).toHaveCount(0);
	const selectedText = await selectNativeRange(page, 2, 12);
	await expect(action).toBeVisible();
	await action.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 2 });
	await page.evaluate(() => {
		window.getSelection()?.removeAllRanges();
		document.dispatchEvent(new Event('selectionchange'));
	});
	await expect(action).toBeVisible();
	await action.click();
	await expect(page.getByRole('region', { name: `"${selectedText}" 댓글`, exact: true })).toBeVisible();
	const input = page.getByRole('textbox', { name: '댓글 입력' });
	await expect(input).toBeFocused();
	await input.fill('모바일에서 보존할 초안');
	await page.goBack();
	await expect(page).toHaveURL(/\/about$/);
	await expect(page.getByRole('dialog', { name: '인라인 댓글 0', exact: true })).toBeHidden();
	await expect(action).toHaveCount(0);
	await page.goForward();
	await expect(input).toHaveValue('모바일에서 보존할 초안');
});

test('모바일 선택은 native 이벤트를 막지 않고 메뉴와 무관하게 표시되며 접으면 사라진다', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await renderInlineCommentWorkspace(page);
	const root = page.locator('[data-inline-comment-block-id="block-1"]');
	const prevented = await root.evaluate((element) => {
		return ['pointerdown', 'pointermove', 'pointercancel', 'touchstart', 'touchmove', 'selectstart', 'contextmenu'].map(
			(type) => {
				const event = type.startsWith('pointer')
					? new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: 'touch', pointerId: 1 })
					: new Event(type, { bubbles: true, cancelable: true });
				element.dispatchEvent(event);
				return { type, prevented: event.defaultPrevented };
			},
		);
	});
	expect(prevented.filter((event) => event.prevented)).toEqual([]);
	await selectNativeRange(page);
	const action = page.getByRole('button', { name: '댓글 추가', exact: true });
	await expect(action).toBeVisible();
	await root.dispatchEvent('contextmenu');
	await expect(action).toBeVisible();
	await page.evaluate(() => window.getSelection()?.collapseToEnd());
	await expect(action).toHaveCount(0);
	await selectNativeRange(page);
	await expect(action).toBeVisible();
	await page.evaluate(() => window.getSelection()?.removeAllRanges());
	await expect(action).toHaveCount(0);
	await selectNativeRange(page);
	await page.mouse.wheel(0, 120);
	await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
	expect(await page.evaluate(() => getComputedStyle(document.body).position)).not.toBe('fixed');
});

test('실제 App Router 상세에서 댓글을 닫은 뒤에만 이전 매거진으로 돌아간다', async ({ page }) => {
	const pageErrors: string[] = [];
	const hydrationErrors: string[] = [];
	page.on('pageerror', (error) => pageErrors.push(error.message));
	page.on('console', (message) => {
		if (/hydration|did not match/i.test(message.text())) hydrationErrors.push(message.text());
	});
	await page.route('https://api.rilog.test/**', async (route) => {
		const pathname = new URL(route.request().url()).pathname;
		if (pathname.endsWith('/comment-anchors/sidebar')) {
			await route.fulfill({ json: { status: 200, message: 'OK', data: { anchorGroups: [] } } });
		} else if (pathname.endsWith('/comment-anchors')) {
			await route.fulfill({ json: { status: 200, message: 'OK', data: { blocks: [] } } });
		} else if (pathname.endsWith('/history')) {
			await route.fulfill({ status: 204 });
		} else {
			await route.fulfill({ status: 401, json: { errorCode: 'UNAUTHORIZED', message: 'Guest fixture' } });
		}
	});
	await page.setViewportSize({ width: 390, height: 844 });
	await page.goto('/the-rilog');
	await page.getByRole('link', { name: '기업 기사', exact: true }).click();
	await expect(page).toHaveURL(/\/@the_rilog\/posts\/101$/);
	await expect(page.getByRole('heading', { level: 1, name: '기업 기사' })).toBeVisible();
	await expect(page.getByRole('button', { name: '댓글 작성' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: '전체 댓글 0개 보기' })).toHaveText('전체 댓글');
	// Dev-only issues badge overlaps this fixed mobile action; dismiss it through its own control.
	const issuesBadge = page.getByRole('button', { name: 'Collapse issues badge' });
	if (await issuesBadge.isVisible()) await issuesBadge.click();
	await page.getByRole('button', { name: '전체 댓글 0개 보기' }).click();
	const dialog = page.getByRole('dialog', { name: '전체 인라인 댓글 0' });
	await expect(dialog).toBeVisible();
	await page.reload();
	await expect(dialog).toBeVisible();
	await page.goBack();
	await expect(dialog).toBeHidden();
	await expect(page).toHaveURL(/\/@the_rilog\/posts\/101$/);
	await expect(page.getByRole('heading', { level: 1, name: '기업 기사' })).toBeVisible();
	await page.goBack();
	await expect(page).toHaveURL(/\/the-rilog$/);
	expect(pageErrors).toEqual([]);
	expect(hydrationErrors).toEqual([]);
});

test('비회원의 native 선택 확정은 스크롤 잠금을 해제하고 로그인을 연다', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await renderInlineCommentWorkspace(page, undefined, false);
	await page.locator('[data-inline-comment-block-id="block-1"]').evaluate((element) => {
		const node = element.firstChild;
		if (!node) throw new Error('본문이 없습니다.');
		const range = document.createRange();
		range.setStart(node, 0);
		range.setEnd(node, 5);
		window.getSelection()?.removeAllRanges();
		window.getSelection()?.addRange(range);
		document.dispatchEvent(new Event('selectionchange'));
	});
	await page.getByRole('button', { name: '댓글 추가' }).click();
	await expect(page.getByRole('dialog', { name: '로그인', exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: '선택 취소' })).toHaveCount(0);
	await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).position)).not.toBe('fixed');
	await page.getByRole('button', { name: '모달 닫기' }).click();
	await expect(page.getByRole('button', { name: '전체 댓글 0개 보기' })).toBeVisible();
});

test('키보드 위의 고정 입력바는 상단 인용문을 중복하지 않고 입력을 네 줄까지 늘린다', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await renderInlineCommentWorkspace(page);
	const quotedText = '모바일에서 선택한 긴 인용문은 상단에서 전체를 확인할 수 있어야 합니다. '.repeat(4);
	await page.locator('[data-inline-comment-block-id="block-1"]').evaluate((element, text) => {
		element.textContent = text;
		const range = document.createRange();
		range.selectNodeContents(element);
		window.getSelection()?.removeAllRanges();
		window.getSelection()?.addRange(range);
		document.dispatchEvent(new Event('selectionchange'));
	}, quotedText);
	await page.getByRole('button', { name: '댓글 추가' }).click();
	const composer = page.getByRole('region', { name: '댓글 작성 입력바', exact: true });
	const quoteRegion = page.getByRole('region', { name: `"${quotedText}" 댓글`, exact: true });
	const input = composer.getByRole('textbox', { name: '댓글 입력' });
	const submit = composer.getByRole('button', { name: '작성', exact: true });
	await expect(quoteRegion.getByText(quotedText, { exact: true })).toBeVisible();
	await expect(composer.getByLabel('댓글 대상 인용문')).toHaveCount(0);
	await expect(input).toBeFocused();
	await expect(submit).toBeDisabled();
	expect(await input.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
	await input.fill(Array.from({ length: 20 }, (_, index) => `긴 댓글 ${index + 1}번째 줄`).join('\n'));
	await expect(submit).toBeEnabled();
	// The real CSS viewport stays 844px; simulate a different height reported by the browser.
	for (const { viewportHeight, offsetTop, reportedInnerHeight } of [
		{ viewportHeight: 400, offsetTop: 0, reportedInnerHeight: 844 },
		{ viewportHeight: 450, offsetTop: 24, reportedInnerHeight: 760 },
		{ viewportHeight: 350, offsetTop: 40, reportedInnerHeight: 700 },
		{ viewportHeight: 400, offsetTop: 0, reportedInnerHeight: 844 },
	]) {
		await page.evaluate(
			({ height, offsetTop: viewportOffset, reportedInnerHeight: innerHeight }) => {
				Object.defineProperty(window, 'innerHeight', {
					configurable: true,
					get: () => innerHeight,
				});
				if (!window.visualViewport) throw new Error('visualViewport가 없습니다.');
				Object.defineProperty(window.visualViewport, 'height', { configurable: true, get: () => height });
				Object.defineProperty(window.visualViewport, 'offsetTop', { configurable: true, get: () => viewportOffset });
				window.visualViewport.dispatchEvent(new Event('resize'));
			},
			{ height: viewportHeight, offsetTop, reportedInnerHeight },
		);
		expect(
			await page.evaluate(() => {
				const probe = document.createElement('div');
				probe.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none';
				document.body.append(probe);
				const height = probe.getBoundingClientRect().height;
				probe.remove();
				return height;
			}),
		).toBe(844);
		await expect
			.poll(async () => {
				const box = await composer.boundingBox();
				return box === null ? Infinity : box.y + box.height;
			})
			.toBeCloseTo(viewportHeight + offsetTop, 0);
		await expect(input).toBeInViewport();
		await expect(submit).toBeInViewport();
		const inputBox = await input.boundingBox();
		const submitBox = await submit.boundingBox();
		if (!inputBox || !submitBox) throw new Error('입력바 위치가 없습니다.');
		expect(submitBox.x).toBeGreaterThan(inputBox.x + inputBox.width);
		expect(submitBox.height).toBeGreaterThanOrEqual(44);
		expect(Math.abs(submitBox.y + submitBox.height - inputBox.y - inputBox.height)).toBeLessThanOrEqual(1);
	}
	const inputMetrics = await input.evaluate((element) => {
		const style = getComputedStyle(element);
		return {
			height: element.getBoundingClientRect().height,
			lineHeight: Number.parseFloat(style.lineHeight),
			padding: Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom),
			border: Number.parseFloat(style.borderTopWidth) + Number.parseFloat(style.borderBottomWidth),
			scrollHeight: element.scrollHeight,
			clientHeight: element.clientHeight,
		};
	});
	expect(inputMetrics.height).toBeLessThanOrEqual(
		inputMetrics.lineHeight * 4 + inputMetrics.padding + inputMetrics.border + 1,
	);
	expect(inputMetrics.scrollHeight).toBeGreaterThan(inputMetrics.clientHeight);
});

test('처음 빠르게 작성창을 열어 키보드가 올라와도 하단 입력바를 스크롤하지 않고 화면 안에 유지한다', async ({
	page,
}) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await renderInlineCommentWorkspace(page);
	await page.locator('[data-inline-comment-block-id="block-1"]').evaluate((element) => {
		const range = document.createRange();
		range.selectNodeContents(element);
		window.getSelection()?.removeAllRanges();
		window.getSelection()?.addRange(range);
		document.dispatchEvent(new Event('selectionchange'));
	});
	await page.evaluate(() => {
		const viewport = window.visualViewport;
		if (!viewport) throw new Error('visualViewport가 없습니다.');
		let height = viewport.height;
		let offsetTop = viewport.offsetTop;
		Object.defineProperties(viewport, {
			height: { configurable: true, get: () => height },
			offsetTop: { configurable: true, get: () => offsetTop },
		});
		const record = {
			footerScrollCalls: 0,
			frames: [] as { bottom: number; visibleBottom: number }[],
			finished: false,
			started: false,
		};
		Object.assign(window, { keyboardEntryRecord: record });
		const originalScrollIntoView = Object.getOwnPropertyDescriptor(Element.prototype, 'scrollIntoView')
			?.value as Element['scrollIntoView'];
		Element.prototype.scrollIntoView = function (options) {
			if (this.closest('[data-mobile-comment-composer]')) record.footerScrollCalls += 1;
			originalScrollIntoView.call(this, options);
		};
		document.addEventListener('focusin', (event) => {
			if (!(event.target instanceof HTMLTextAreaElement) || !event.target.closest('[data-mobile-comment-composer]'))
				return;
			if (record.started) return;
			record.started = true;
			const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
			void (async () => {
				const footer = event.target instanceof Element ? event.target.closest('[data-mobile-comment-composer]') : null;
				const dialog = footer?.closest('dialog');
				if (!footer || !dialog) throw new Error('하단 입력바가 없습니다.');
				const capture = () => {
					record.frames.push({ bottom: footer.getBoundingClientRect().bottom, visibleBottom: height + offsetTop });
				};
				capture();
				for (const frame of [
					{ height: 760, offsetTop: 0 },
					{ height: 650, offsetTop: 12 },
					{ height: 520, offsetTop: 20 },
					{ height: 400, offsetTop: 32 },
				]) {
					height = frame.height;
					offsetTop = frame.offsetTop;
					viewport.dispatchEvent(new Event('resize'));
					viewport.dispatchEvent(new Event('scroll'));
					await nextFrame();
					capture();
				}
				await Promise.all(dialog.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
				for (const frame of [
					{ height: 430, offsetTop: 16 },
					{ height: 400, offsetTop: 24 },
					{ height: 450, offsetTop: 8 },
				]) {
					height = frame.height;
					offsetTop = frame.offsetTop;
					viewport.dispatchEvent(new Event('resize'));
					viewport.dispatchEvent(new Event('scroll'));
					for (let index = 0; index < 4; index += 1) {
						await nextFrame();
						capture();
					}
				}
				record.finished = true;
			})();
		});
	});
	await page.getByRole('button', { name: '댓글 추가' }).click();
	await expect(page.getByRole('textbox', { name: '댓글 입력' })).toBeFocused();
	await expect
		.poll(() => page.evaluate(() => (Reflect.get(window, 'keyboardEntryRecord') as { finished: boolean }).finished))
		.toBe(true);
	const record = await page.evaluate(
		() =>
			Reflect.get(window, 'keyboardEntryRecord') as {
				footerScrollCalls: number;
				frames: { bottom: number; visibleBottom: number }[];
			},
	);
	expect(record.footerScrollCalls).toBe(0);
	expect(record.frames.length).toBeGreaterThanOrEqual(12);
	for (const frame of record.frames) expect(frame.bottom).toBeLessThanOrEqual(frame.visibleBottom + 1);
});

test('긴 댓글을 수정할 때 키보드 위에 수정 입력과 저장 버튼이 함께 보인다', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const content = Array.from({ length: 20 }, (_, index) => `수정할 댓글 ${index + 1}`).join('\n');
	const group = createComposerThreadGroup(91, '브라우저에', 0, {
		commentAnchorId: 900,
		content,
		canEdit: true,
		canDelete: true,
	});
	group.commentAnchors[0].author.nickname = '작성자';
	await mockThreadGroups(page, [group]);
	await renderInlineCommentWorkspace(page, 91);
	await page.getByRole('button', { name: '수정', exact: true }).click();
	const input = page.getByRole('textbox', { name: '댓글 수정' });
	await expect(input).toHaveValue(content);
	expect(await input.evaluate((element) => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(16);
	await page.evaluate(() => {
		if (!window.visualViewport) throw new Error('visualViewport가 없습니다.');
		Object.defineProperty(window.visualViewport, 'height', { configurable: true, get: () => 400 });
		window.visualViewport.dispatchEvent(new Event('resize'));
	});
	const save = page.getByRole('button', { name: '저장', exact: true });
	await expect
		.poll(async () => {
			const box = await save.boundingBox();
			return box === null ? Infinity : box.y + box.height;
		})
		.toBeLessThanOrEqual(400);
	await expect.poll(async () => (await input.boundingBox())?.y ?? -1).toBeGreaterThanOrEqual(0);
	await expect(input).toBeInViewport();
	await expect(save).toBeInViewport();
	await input.fill(`${content}\n추가 수정`);
	await expect(save).toBeInViewport();
});

for (const width of [1100, 1440]) {
	test(`${width}px 선택 모드 진입·취소에서 본문 폭과 읽던 위치가 유지된다`, async ({ page }) => {
		await page.setViewportSize({ width, height: 900 });
		await renderInlineCommentWorkspace(page);
		await page.evaluate(() => {
			document.documentElement.style.overflowY = 'scroll';
			window.scrollTo(0, 120);
		});
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(120);
		const article = page.getByRole('article', { name: '게시글 본문' });
		const before = await article.boundingBox();
		if (!before) throw new Error('본문 위치를 확인할 수 없습니다.');
		await page.getByRole('button', { name: '댓글 작성' }).click();
		await expect.poll(async () => (await article.boundingBox())?.width).toBeCloseTo(before.width, 0);
		await expect.poll(async () => (await article.boundingBox())?.x).toBeCloseTo(before.x, 0);
		await expect.poll(async () => (await article.boundingBox())?.y).toBeCloseTo(before.y, 0);
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(120);
		await page.mouse.wheel(0, 250);
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(120);
		if (width === 1100) await page.goBack();
		else await page.getByRole('button', { name: '선택 취소' }).click();
		await expect(page).toHaveURL(/\/about$/);
		await expect(page.getByRole('button', { name: '댓글 작성' })).toBeVisible();
		await expect.poll(async () => (await article.boundingBox())?.width).toBeCloseTo(before.width, 0);
		await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(120);
		await expect.poll(() => page.evaluate(() => document.documentElement.style.overflowY)).toBe('scroll');
	});
}

test('화면 아래의 선택 끝에는 댓글 버튼을 위에 배치하고 화면 안에 유지한다', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await renderInlineCommentWorkspace(page);
	const root = page.locator('[data-inline-comment-block-id="block-1"]');
	await root.evaluate((element) => {
		const article = element.closest('article');
		if (!article) throw new Error('본문이 없습니다.');
		article.style.marginTop = '1000px';
		window.scrollTo(0, window.scrollY + element.getBoundingClientRect().top - (window.innerHeight - 35));
	});
	const selectionTop = await root.evaluate((element) => {
		const node = element.firstChild;
		if (!node) throw new Error('텍스트가 없습니다.');
		const range = document.createRange();
		range.setStart(node, 0);
		range.setEnd(node, 5);
		window.getSelection()?.removeAllRanges();
		window.getSelection()?.addRange(range);
		document.dispatchEvent(new Event('selectionchange'));
		return range.getBoundingClientRect().top;
	});
	const action = page.getByRole('button', { name: '댓글 추가' });
	await expect(action).toBeVisible();
	await expect(action).toBeInViewport();
	const box = await action.boundingBox();
	if (!box) throw new Error('댓글 버튼이 없습니다.');
	expect(box.y + box.height).toBeLessThan(selectionTop);
	expect(box.x).toBeGreaterThanOrEqual(0);
	expect(box.x + box.width).toBeLessThanOrEqual(390);
});

test('모바일 전체 댓글 진입은 하나의 하단 버튼이며 입력에 자동 포커스하지 않는다', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await renderInlineCommentWorkspace(page);
	await expect(page.getByRole('button', { name: '댓글 작성', exact: true })).toHaveCount(0);
	await expect(page.getByRole('region', { name: '댓글 선택 모드' })).toHaveCount(0);
	const entry = page.getByRole('button', { name: '전체 댓글 0개 보기' });
	await expect(entry).toHaveCount(1);
	await expect(entry).toHaveText('전체 댓글');
	const box = await entry.boundingBox();
	if (!box) throw new Error('전체 댓글 버튼이 없습니다.');
	expect(box.y).toBeGreaterThan(844 / 2);
	await entry.click();
	await expect(page.getByRole('dialog', { name: '전체 인라인 댓글 0' })).toBeVisible();
	await expect(page.getByRole('heading', { name: '전체 인라인 댓글 0' })).toBeFocused();
	await expect(page.getByRole('button', { name: '댓글 사이드바 닫기' })).toHaveCount(0);
	await expect(page.getByRole('button', { name: '댓글창 확장' })).toBeVisible();
	await page.mouse.click(8, 8);
	await expect(page.getByRole('dialog', { name: '전체 인라인 댓글 0' })).toBeHidden();
});

test('실제 상세의 기존 밑줄은 선택 중에도 남고 호버·클릭은 선택 종료 후에만 반응한다', async ({ page }) => {
	await page.setViewportSize({ width: 1100, height: 900 });
	const group = createComposerThreadGroup(91, '실제', 0, { commentAnchorId: 900, content: '기존 댓글' });
	group.blockId = 'article-101';
	group.commentAnchors[0].author.nickname = '작성자';
	await page.route('https://api.rilog.test/**', async (route) => {
		const path = new URL(route.request().url()).pathname;
		if (path.endsWith('/comment-anchors/sidebar'))
			await route.fulfill({
				json: { status: 200, message: 'OK', data: { anchorGroups: [{ ...group, blockId: 'article-101' }] } },
			});
		else if (path.endsWith('/comment-anchors'))
			await route.fulfill({
				json: { status: 200, message: 'OK', data: { blocks: [{ blockId: 'article-101', anchorGroups: [group] }] } },
			});
		else if (path.endsWith('/history')) await route.fulfill({ status: 204 });
		else await route.fulfill({ status: 401, json: { errorCode: 'UNAUTHORIZED', message: 'Guest fixture' } });
	});
	await page.goto('/@the_rilog/posts/101');
	const root = page.locator('[data-inline-comment-block-id="article-101"]');
	const line = page.locator('[data-inline-comment-highlight][data-inline-comment-anchor-id="91"]');
	await expect(line).toHaveCount(1);
	const anchorButton = page.locator('[data-inline-comment-anchor-proxy]');
	const blockButton = page.locator('[data-inline-comment-block-button]');
	await expect(anchorButton).toBeEnabled();
	await expect(blockButton).toBeEnabled();
	await root.scrollIntoViewIfNeeded();
	const height = (await line.boundingBox())?.height;
	if (height === undefined) throw new Error('밑줄을 찾을 수 없습니다.');
	const point = await root.evaluate((element) => {
		const node = document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode();
		if (!node) throw new Error('본문 텍스트가 없습니다.');
		const range = document.createRange();
		range.setStart(node, 0);
		range.setEnd(node, 2);
		const rect = range.getBoundingClientRect();
		return { x: rect.left + 2, y: rect.top + rect.height / 2 };
	});
	await page.mouse.move(point.x, point.y);
	await expect.poll(async () => (await line.boundingBox())?.height ?? 0).toBeGreaterThan(height);
	// 포인터가 밑줄 위에 있는 상태에서 모드를 바꿔 기존 호버 강조도 해제되는지 확인한다.
	await page.getByRole('button', { name: '댓글 작성' }).focus();
	await page.keyboard.press('Enter');
	await expect(line).toHaveCount(1);
	await expect(line).toBeVisible();
	await expect(anchorButton).toBeDisabled();
	await expect(blockButton).toBeDisabled();
	await page.mouse.move(point.x, point.y);
	await expect.poll(async () => (await line.boundingBox())?.height).toBe(height);
	await page.mouse.click(point.x, point.y);
	await expect(page.getByRole('dialog', { name: '인라인 댓글 1', exact: true })).toBeHidden();
	await expect(line).toBeVisible();
	await page.getByRole('button', { name: '선택 취소' }).click();
	await expect(anchorButton).toBeEnabled();
	await expect(blockButton).toBeEnabled();
	await page.mouse.move(point.x + 1, point.y);
	await expect.poll(async () => (await line.boundingBox())?.height ?? 0).toBeGreaterThan(height);
	await page.mouse.click(point.x, point.y);
	const comments = page.getByRole('dialog', { name: '인라인 댓글 1', exact: true });
	await expect(comments).toBeVisible();
	await page.getByRole('button', { name: '댓글 사이드바 닫기', exact: true }).click();
	await expect(comments).toBeHidden();
	await anchorButton.focus();
	await page.keyboard.press('Enter');
	await expect(comments).toBeVisible();
});

test('모바일 시트는 열고 닫는 동안 화면 안에서 연속적으로 이동한다', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await renderInlineCommentWorkspace(page);
	const recording = page.evaluate(
		() =>
			new Promise<Array<{ top: number; state: string }>>((resolve) => {
				const frames: Array<{ top: number; state: string }> = [];
				let opened = false;
				let done = false;
				const timeout = window.setTimeout(() => {
					done = true;
					resolve(frames);
				}, 2500);
				const frame = () => {
					if (done) return;
					const dialog = document.querySelector<HTMLDialogElement>('dialog:has([data-comment-bottom-sheet])');
					if (dialog?.open) {
						opened = true;
						frames.push({ top: dialog.getBoundingClientRect().top, state: dialog.dataset.state ?? '' });
					} else if (opened) {
						done = true;
						window.clearTimeout(timeout);
						resolve(frames);
						return;
					}
					window.requestAnimationFrame(frame);
				};
				window.requestAnimationFrame(frame);
			}),
	);
	await page.getByRole('button', { name: '전체 댓글 0개 보기' }).click();
	const dialog = page.getByRole('dialog', { name: '전체 인라인 댓글 0' });
	await expect(dialog).toHaveAttribute('data-state', 'open');
	await dialog.evaluate(async (element) => {
		element.getBoundingClientRect();
		await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
	});
	const restingTop = (await dialog.boundingBox())?.y;
	if (restingTop === undefined) throw new Error('시트 위치를 찾을 수 없습니다.');
	await page.mouse.click(8, 8);
	await expect(dialog).toBeHidden();
	const frames = await recording;
	const isBetween = (top: number) => top > restingTop + 20 && top < 844 - 20;
	expect(frames.some(({ top, state }) => state === 'open' && isBetween(top))).toBe(true);
	expect(frames.some(({ top, state }) => state === 'closing' && isBetween(top))).toBe(true);
});

test('시트를 조금 아래로 당길 때 내용 높이를 유지하고 놓으면 원래 위치로 돌아온다', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await renderInlineCommentWorkspace(page);
	await page.getByRole('button', { name: '전체 댓글 0개 보기' }).click();
	const dialog = page.getByRole('dialog', { name: '전체 인라인 댓글 0' });
	await expect(dialog).toHaveAttribute('data-state', 'open');
	await dialog.evaluate(async (element) => {
		element.getBoundingClientRect();
		await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
	});
	const before = await dialog.boundingBox();
	const handle = await page.getByRole('button', { name: '댓글창 확장' }).boundingBox();
	if (!before || !handle) throw new Error('시트 위치가 없습니다.');
	const x = handle.x + handle.width / 2;
	const y = handle.y + handle.height / 2;
	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x, y + 40, { steps: 6 });
	await expect.poll(async () => (await dialog.boundingBox())?.y).toBeCloseTo(before.y + 40, 0);
	await expect.poll(async () => (await dialog.boundingBox())?.height).toBeCloseTo(before.height, 0);
	await page.mouse.up();
	await expect(dialog).toBeVisible();
	await expect.poll(async () => (await dialog.boundingBox())?.y).toBeCloseTo(before.y, 0);
	await expect(page.getByRole('button', { name: '댓글창 확장' })).toHaveAttribute('aria-expanded', 'false');
});

test('동작 줄이기 설정에서는 시트 이동 애니메이션 없이 열고 닫는다', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'reduce' });
	await page.setViewportSize({ width: 390, height: 844 });
	await renderInlineCommentWorkspace(page);
	const entry = page.getByRole('button', { name: '전체 댓글 0개 보기' });
	await entry.focus();
	await page.keyboard.press('Enter');
	const dialog = page.getByRole('dialog', { name: '전체 인라인 댓글 0' });
	await expect(dialog).toHaveAttribute('data-state', 'open');
	await expect(dialog).toBeInViewport();
	expect(await dialog.evaluate((element) => element.getAnimations().length)).toBe(0);
	await page.keyboard.press('Escape');
	await expect(dialog).toBeHidden();
	await expect(entry).toBeFocused();
});

test('올라오는 시트의 손잡이를 잡아도 현재 위치에서 튀지 않는다', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	await renderInlineCommentWorkspace(page);
	await page.getByRole('button', { name: '전체 댓글 0개 보기' }).click();
	const dialog = page.getByRole('dialog', { name: '전체 인라인 댓글 0' });
	await expect(dialog).toHaveAttribute('data-state', 'open');
	await dialog.evaluate((element) => {
		const animation = element
			.getAnimations()
			.find(
				(item) =>
					item.effect instanceof KeyframeEffect &&
					item.effect.getKeyframes().some((frame) => frame.translate !== undefined),
			);
		if (!animation?.effect) throw new Error('시트 이동 애니메이션이 없습니다.');
		animation.pause();
		animation.currentTime = Number(animation.effect.getComputedTiming().duration) / 2;
	});
	const before = await dialog.boundingBox();
	const handle = await page.getByRole('button', { name: '댓글창 확장' }).boundingBox();
	if (!before || !handle) throw new Error('시트 위치가 없습니다.');
	await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2);
	await page.mouse.down();
	await expect.poll(async () => (await dialog.boundingBox())?.y).toBeCloseTo(before.y, 0);
	await page.mouse.up();
});

test('여러 인용문 사이에서 하단 입력 대상을 바꿔도 초안을 보존하고 선택한 대상에만 작성한다', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const groups = [createComposerThreadGroup(91, '브라우저에서', 0), createComposerThreadGroup(92, '선택하여', 7)];
	await mockThreadGroups(page, groups);
	await page.route('**/v1/posts/106/selections/91/comment-anchors', (route) =>
		route.fulfill({
			json: { status: 0, message: 'OK', data: { commentAnchorId: 999 } },
		}),
	);
	await renderInlineCommentWorkspace(page);
	await page.getByRole('button', { name: '전체 댓글 2개 보기' }).click();
	const composer = page.getByRole('region', { name: '댓글 작성 입력바', exact: true });
	await expect(composer.getByLabel('댓글 대상 인용문')).toHaveCount(0);
	const input = composer.getByRole('textbox', { name: '댓글 입력' });
	await expect(input).toHaveCount(0);
	await expect(page.getByRole('heading', { name: '전체 인라인 댓글 2' })).toBeFocused();
	const first = page.getByRole('region', { name: '"브라우저에서" 댓글', exact: true });
	const second = page.getByRole('region', { name: '"선택하여" 댓글', exact: true });
	const firstTarget = first.getByRole('button', { name: '인용문 선택: 브라우저에서', exact: true });
	const secondTarget = second.getByRole('button', { name: '인용문 선택: 선택하여', exact: true });
	await expect(first.getByRole('button', { name: '댓글 쓰기', exact: true })).toHaveCount(0);
	await expect(second.getByRole('button', { name: '댓글 쓰기', exact: true })).toHaveCount(0);
	await firstTarget.click();
	await expect(firstTarget).toHaveAttribute('aria-pressed', 'true');
	await expect(first.getByRole('button', { name: '댓글 접기', exact: true })).toHaveAttribute('aria-expanded', 'true');
	await expect(input).toBeFocused();
	await input.fill('첫 번째 인용문 초안');
	const composerBefore = await composer.boundingBox();
	await secondTarget.click();
	await expect(secondTarget).toHaveAttribute('aria-pressed', 'true');
	await expect(firstTarget).toHaveAttribute('aria-pressed', 'false');
	await expect(input).toHaveValue('');
	await input.fill('두 번째 인용문 초안');
	const composerAfter = await composer.boundingBox();
	if (!composerBefore || !composerAfter) throw new Error('입력바 위치가 없습니다.');
	expect(composerAfter.y).toBeCloseTo(composerBefore.y, 0);
	await first.getByRole('button', { name: '댓글 접기', exact: true }).click();
	await expect(first.getByRole('button', { name: '댓글 펼치기', exact: true })).toHaveAttribute(
		'aria-expanded',
		'false',
	);
	await expect(secondTarget).toHaveAttribute('aria-pressed', 'true');
	await expect(firstTarget).toHaveAttribute('aria-pressed', 'false');
	await expect(input).toHaveValue('두 번째 인용문 초안');
	await first.getByRole('button', { name: '댓글 펼치기', exact: true }).click();
	await expect(secondTarget).toHaveAttribute('aria-pressed', 'true');
	await firstTarget.click();
	await expect(firstTarget).toHaveAttribute('aria-pressed', 'true');
	await expect(input).toHaveValue('첫 번째 인용문 초안');
	const submitted = page.waitForRequest(
		(request) => request.method() === 'POST' && request.url().endsWith('/posts/106/selections/91/comment-anchors'),
	);
	await composer.getByRole('button', { name: '작성', exact: true }).click();
	expect((await submitted).postDataJSON()).toEqual({ content: '첫 번째 인용문 초안' });
	await expect(input).toHaveValue('');
	await secondTarget.click();
	await expect(input).toHaveValue('두 번째 인용문 초안');
});

test('기존 댓글 목록을 스크롤해도 작성 버튼이 있는 하단 입력바는 같은 자리에 남는다', async ({ page }) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const group = createComposerThreadGroup(91, '브라우저에서', 0);
	await mockThreadGroups(page, [group]);
	await renderInlineCommentWorkspace(page, 91);
	const dialog = page.getByRole('dialog', { name: '인라인 댓글 1', exact: true });
	await expect(dialog).toHaveAttribute('data-state', 'open');
	await dialog.evaluate(async (element) => {
		element.getBoundingClientRect();
		await Promise.all(element.getAnimations().map((animation) => animation.finished.catch(() => undefined)));
	});
	const composer = page.getByRole('region', { name: '댓글 작성 입력바', exact: true });
	await expect(composer.getByLabel('댓글 대상 인용문')).toHaveCount(0);
	await expect(
		page.getByRole('region', { name: '"브라우저에서" 댓글', exact: true }).getByText('브라우저에서', { exact: true }),
	).toBeVisible();
	await expect(composer.getByRole('textbox', { name: '댓글 입력' })).not.toBeFocused();
	const section = page.getByRole('region', { name: '"브라우저에서" 댓글', exact: true });
	const before = await composer.boundingBox();
	const contentBefore = await section.boundingBox();
	const sheet = await dialog.boundingBox();
	if (!before || !contentBefore || !sheet) throw new Error('댓글 화면 위치가 없습니다.');
	await page.mouse.move(sheet.x + 40, sheet.y + 180);
	await page.mouse.wheel(0, 240);
	await expect.poll(async () => (await section.boundingBox())?.y ?? Infinity).toBeLessThan(contentBefore.y);
	const after = await composer.boundingBox();
	if (!after) throw new Error('입력바 위치가 없습니다.');
	expect(after.y).toBeCloseTo(before.y, 0);
	expect(after.height).toBeCloseTo(before.height, 0);
	await expect(composer.getByRole('button', { name: '작성', exact: true })).toBeInViewport();
});

const renderOwnedCommentThread = async (page: Page) => {
	await page.setViewportSize({ width: 390, height: 844 });
	const group = createComposerThreadGroup(91, '브라우저에서', 0);
	group.commentAnchors[0] = {
		...group.commentAnchors[0],
		content: '수정 또는 삭제할 댓글',
		canEdit: true,
		canDelete: true,
	};
	await mockThreadGroups(page, [group]);
	await renderInlineCommentWorkspace(page);
	await page.getByRole('button', { name: '전체 댓글 1개 보기' }).click();
};

test('삭제 확인창에서 브라우저 뒤로가기로 댓글창을 닫아도 숨은 모달이 본문 클릭을 막지 않는다', async ({ page }) => {
	await renderOwnedCommentThread(page);
	await page.getByRole('button', { name: '삭제', exact: true }).click();
	await expect(page.getByRole('dialog', { name: '댓글을 삭제할까요?' })).toBeVisible();
	await page.goBack();
	await expect(page).toHaveURL(/\/about$/);
	await expect(page.locator('dialog:modal')).toHaveCount(0);
	await page.getByRole('button', { name: '전체 댓글 1개 보기' }).click();
	await expect(page.getByRole('dialog', { name: '전체 인라인 댓글 1', exact: true })).toBeVisible();
	await expect(page.getByRole('dialog', { name: '댓글을 삭제할까요?' })).toBeHidden();
});

test('댓글창을 닫은 뒤 수정 요청이 실패해도 숨은 오류 모달 없이 편집 초안으로 재진입한다', async ({ page }) => {
	const pending = Promise.withResolvers<void>();
	await page.route('**/v1/posts/106/comment-anchors/991', async (route) => {
		await pending.promise;
		await route.fulfill({ status: 500, json: { status: 500, message: '실패', data: null } });
	});
	await renderOwnedCommentThread(page);
	await page.getByRole('button', { name: '수정', exact: true }).click();
	await page.getByRole('textbox', { name: '댓글 수정' }).fill('기존 수정 초안');
	const requested = page.waitForRequest((request) => request.method() === 'PATCH');
	await page.getByRole('button', { name: '저장', exact: true }).click();
	await requested;
	await page.goBack();
	await expect(page.locator('dialog:modal')).toHaveCount(0);
	const failedResponse = page.waitForResponse((response) => response.request().method() === 'PATCH');
	pending.resolve();
	await failedResponse;
	await page.getByRole('button', { name: '전체 댓글 1개 보기' }).click();
	await expect(page.getByRole('textbox', { name: '댓글 수정' })).toHaveValue('기존 수정 초안');
	await expect(page.getByRole('button', { name: '저장', exact: true })).toBeEnabled();
	await expect(page.getByRole('alertdialog')).toHaveCount(0);
});
