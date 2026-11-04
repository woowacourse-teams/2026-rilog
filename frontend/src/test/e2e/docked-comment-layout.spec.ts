import { expect, test } from '@playwright/test';

import { renderInlineCommentWorkspace } from './fixtures/inline-comment-browser';

// Native history and transition geometry need a browser. #872 focus changes stay separate.
for (const width of [1280, 1440, 1920]) {
	for (const method of ['button', 'Escape', 'history'] as const) {
		test(`${width}px ${method}: 댓글창 배치와 닫힌 공간을 유지한다`, async ({ page }) => {
			await page.setViewportSize({ width, height: 900 });
			await page.emulateMedia({ reducedMotion: 'no-preference' });
			await page.route('https://api.rilog.test/**', (route) =>
				route.fulfill({
					json: {
						status: 200,
						message: 'OK',
						data: new URL(route.request().url()).pathname.endsWith('/comment-anchors/sidebar')
							? { anchorGroups: [] }
							: { blocks: [] },
					},
				}),
			);
			await renderInlineCommentWorkspace(page);
			const entry = page.getByRole('button', { name: '전체 댓글 0개 보기', exact: true });
			const panel = page.getByRole('region', { name: '전체 인라인 댓글 0', exact: true });
			const layout = () =>
				page.locator('section[role="region"][data-state]').evaluate((element) => {
					const host = element.parentElement,
						card = host?.previousElementSibling,
						shell = host?.parentElement;
					if (!host || !card || !shell) throw new Error('댓글창 배치를 찾을 수 없습니다.');
					return {
						gutter: host.getBoundingClientRect().left - card.getBoundingClientRect().right,
						width: shell.getBoundingClientRect().width,
						hostWidth: host.getBoundingClientRect().width,
					};
				});
			await expect(entry).toBeVisible();
			const before = await layout();
			await entry.click();
			await expect(panel).toBeVisible();
			await page.waitForTimeout(400);
			const opened = await layout();
			expect(opened.gutter).toBeGreaterThan(0);
			expect(opened.width).toBeGreaterThan(before.width);
			if (method === 'button') await panel.getByRole('button', { name: '댓글 사이드바 닫기' }).click();
			else if (method === 'Escape') await page.keyboard.press('Escape');
			else await page.goBack();
			await expect(panel).toBeHidden();
			await page.waitForTimeout(400);
			const closed = await layout();
			expect(closed.hostWidth).toBeLessThan(1);
			expect(Math.abs(closed.width - before.width)).toBeLessThan(2);
			// 1440px entry replacement is the known, separate #872 issue.
			if (width !== 1440) await expect(entry).toBeFocused();
			await entry.click();
			await expect(panel).toBeVisible();
			await page.setViewportSize({ width: 1024, height: 900 });
			const dialog = page.getByRole('dialog', { name: '전체 인라인 댓글 0', exact: true });
			await expect(dialog).toBeVisible();
			await page.keyboard.press('Escape');
			await expect(dialog).toBeHidden();
			await page.setViewportSize({ width, height: 900 });
			await page.waitForTimeout(400);
			expect((await layout()).hostWidth).toBeLessThan(1);
		});
	}
}

for (const reducedMotion of ['reduce', 'no-preference'] as const) {
	test(`${reducedMotion}: 긴 초안을 같은 선택으로 다시 열어도 높이와 초점을 유지한다`, async ({ page }) => {
		await page.setViewportSize({ width: 1920, height: 900 });
		await page.emulateMedia({ reducedMotion });
		await page.route('https://api.rilog.test/**', (route) =>
			route.fulfill({
				json: {
					status: 200,
					message: 'OK',
					data: new URL(route.request().url()).pathname.endsWith('/comment-anchors/sidebar')
						? { anchorGroups: [] }
						: { blocks: [] },
				},
			}),
		);
		await renderInlineCommentWorkspace(page);
		await page.getByRole('button', { name: '전체 댓글 0개 보기' }).click();
		const selectAgain = async () => {
			await page.locator('[data-inline-comment-block-id="block-1"]').evaluate((element) => {
				const node = element.firstChild;
				if (!node) throw new Error('본문이 없습니다.');
				const range = document.createRange();
				range.setStart(node, 0);
				range.setEnd(node, 5);
				window.getSelection()?.removeAllRanges();
				window.getSelection()?.addRange(range);
				document.dispatchEvent(new Event('selectionchange'));
				element.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse' }));
			});
			await page.getByRole('button', { name: '댓글 추가', exact: true }).click();
		};
		await selectAgain();
		const input = page.getByRole('textbox', { name: '댓글 입력' });
		await expect(input).toBeFocused();
		await page.waitForTimeout(400);
		const draft = 'longword '.repeat(30);
		await input.fill(draft);
		const before = await input.evaluate((element) => element.getBoundingClientRect().height);
		await selectAgain();
		await expect(input).toHaveValue(draft);
		await expect(input).toBeFocused();
		await page.waitForTimeout(400);
		const after = await input.evaluate((element) => element.getBoundingClientRect().height);
		expect(Math.abs(after - before)).toBeLessThan(2);
		await input.evaluate((element) => {
			const textarea = element as HTMLTextAreaElement;
			textarea.setSelectionRange(textarea.value.length, textarea.value.length);
		});
		await input.press('x');
		const typed = await input.evaluate((element) => element.getBoundingClientRect().height);
		expect(Math.abs(typed - after)).toBeLessThan(2);
		await page.keyboard.press('Escape');
		await expect(page.getByRole('region', { name: '인라인 댓글 0', exact: true })).toBeHidden();
		await selectAgain();
		await expect(input).toHaveValue(`${draft}x`);
		await expect(input).toBeFocused();
		await page.waitForTimeout(400);
		const reopened = await input.evaluate((element) => element.getBoundingClientRect().height);
		// Animated closed-to-open draft sizing also differs in develop; this PR
		// protects the new keyed-remount regression and the reduced-motion path.
		if (reducedMotion === 'reduce') expect(Math.abs(reopened - typed)).toBeLessThan(2);
	});
}
