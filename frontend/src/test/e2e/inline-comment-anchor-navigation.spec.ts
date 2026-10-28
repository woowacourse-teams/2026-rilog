import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import { createPostDetailResponseFixture } from '@/test/fixtures/post-detail';

import { mockAuthenticatedAccess } from './fixtures/authenticated-access';

const openQuote = async (page: Page, width: number) => {
	const group = {
		selectionId: 91,
		range: { startOffset: 0, endOffset: 2 },
		selectedText: '실제',
		state: 'ACTIVE',
		anchorCount: 1,
		commentAnchors: [
			{
				commentAnchorId: 900,
				content: '기존 댓글',
				author: {
					userId: 1,
					nickname: '작성자',
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
	await page.route('https://api.rilog.test/**', (route) => {
		const path = new URL(route.request().url()).pathname;
		if (path === '/v1/blogs/the_rilog/posts/101') {
			return route.fulfill({
				json: {
					status: 200,
					message: 'OK',
					data: createPostDetailResponseFixture({
						title: '기업 기사',
						content: [
							{
								id: 'article-101',
								type: 'paragraph',
								props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
								content: [{ type: 'text', text: '실제 게시글 상세 경로에서 표시하는 테스트 본문입니다.', styles: {} }],
								children: [],
							},
						],
						owner: { type: 'RILOG', blogId: 1, slug: 'the_rilog', name: 'The Rilog.', profileImageUrl: null },
						postType: 'ENTERPRISE_SPOTLIGHT',
						description: '기업 기사 요약',
						source: { sourceProfileName: '테스트 기업', sourceProfileImage: null },
					}),
				},
			});
		}
		if (path.endsWith('/comment-anchors') || path.endsWith('/comment-anchors/sidebar')) {
			return route.fulfill({
				json: {
					status: 0,
					message: 'OK',
					data: path.endsWith('/sidebar')
						? { anchorGroups: [{ ...group, blockId: 'article-101' }] }
						: { blocks: [{ blockId: 'article-101', anchorGroups: [group] }] },
				},
			});
		}
		if (path === '/v1/posts/count') {
			return route.fulfill({ json: { status: 0, message: 'OK', data: { totalPostsCount: 1 } } });
		}
		if (path.endsWith('/views') || path.endsWith('/history')) return route.fulfill({ status: 204 });
		return route.fulfill({ status: 401, json: { errorCode: 'UNAUTHORIZED', message: 'Guest fixture' } });
	});
	await mockAuthenticatedAccess(page);
	await page.setViewportSize({ width, height: 844 });
	await page.goto('/@the_rilog/posts/101?selectionId=91');
	await expect(page.getByRole('button', { name: '본문으로 이동', exact: true })).toBeVisible();
};

for (const width of [390, 1440]) {
	test(`${width < 768 ? '모바일' : 'PC'} 본문 이동은 인용을 잠깐 강조하고 기존 밑줄로 복귀한다`, async ({ page }) => {
		const pageErrors: string[] = [];
		page.on('pageerror', (error) => pageErrors.push(error.message));
		await page.emulateMedia({ reducedMotion: width < 768 ? 'no-preference' : 'reduce' });
		await openQuote(page, width);
		const quote = page.locator('[data-inline-comment-highlight][data-inline-comment-anchor-id="91"]');
		await expect(quote).not.toHaveCount(0);
		if (width < 768) {
			await page.locator('dialog[open]').evaluate((dialog) => {
				dialog.addEventListener(
					'close',
					() => window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize'))),
					{
						once: true,
					},
				);
			});
		} else {
			await page.getByRole('button', { name: '본문으로 이동', exact: true }).evaluate((button) => {
				button.addEventListener(
					'click',
					() => window.requestAnimationFrame(() => window.dispatchEvent(new Event('resize'))),
					{
						once: true,
					},
				);
			});
		}
		await page.getByRole('button', { name: '본문으로 이동', exact: true }).click();
		await expect
			.poll(() => quote.first().evaluate((element) => getComputedStyle(element, '::before').content))
			.toBe('""');
		await page.evaluate(() => window.dispatchEvent(new Event('resize')));
		await expect
			.poll(() => quote.first().evaluate((element) => getComputedStyle(element, '::before').content))
			.toBe('""');
		await expect(quote.first()).toBeInViewport();
		if (width < 768) {
			await expect.poll(() => page.evaluate(() => document.querySelectorAll('dialog:modal').length)).toBe(0);
		} else {
			await expect(page.getByRole('heading', { name: '인라인 댓글 1', exact: true })).toBeVisible();
		}
		expect(await page.evaluate(() => window.getSelection()?.toString() ?? '')).toBe('');
		await expect
			.poll(() => quote.first().evaluate((element) => getComputedStyle(element, '::before').content), { timeout: 5000 })
			.toBe('none');
		await expect(quote).not.toHaveCount(0);
		expect(pageErrors).toEqual([]);
	});
}
