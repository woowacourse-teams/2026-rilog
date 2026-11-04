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
