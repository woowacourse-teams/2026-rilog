import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

import { createPostDetailResponseFixture } from '@/test/fixtures/post-detail';

import { mockAuthenticatedAccess } from './fixtures/authenticated-access';

const openQuote = async (page: Page, width: number, blockId = 'article-101', directLink = true) => {
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
						? { anchorGroups: [{ ...group, blockId }] }
						: { blocks: [{ blockId, anchorGroups: [group] }] },
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
	await page.goto(`/@the_rilog/posts/101${directLink ? '?selectionId=91' : ''}`);
	if (directLink) await expect(page.getByRole('button', { name: '본문으로 이동', exact: true })).toBeVisible();
};

test('따옴표와 역슬래시가 포함된 블록에서도 본문으로 이동하고 해당 인용을 강조한다', async ({ page }) => {
	const pageErrors: string[] = [];
	page.on('pageerror', (error) => pageErrors.push(error.message));
	const blockId = 'article"quoted\\segment';
	await openQuote(page, 390, blockId, false);
	const entry = page.getByRole('button', { name: '전체 댓글 1개 보기', exact: true });
	await expect(entry).toBeVisible();
	const root = page.locator('[data-inline-comment-block-id="article-101"]');
	await root.evaluate((element, id) => {
		(element as HTMLElement).dataset.inlineCommentBlockId = id;
		window.dispatchEvent(new Event('resize'));
	}, blockId);
	await entry.click();
	await page.getByRole('button', { name: '본문으로 이동', exact: true }).click();
	await expect(page.locator('dialog:modal')).toHaveCount(0);
	const quote = page.locator('[data-inline-comment-highlight][data-inline-comment-anchor-id="91"]');
	await expect(quote.first()).toBeInViewport();
	await expect
		.poll(() => quote.first().evaluate((element) => getComputedStyle(element, '::before').content))
		.toBe('""');
	expect(pageErrors).toEqual([]);
});

test('본문 이동 중 댓글창을 다시 열면 진행 중인 스크롤을 멈춘다', async ({ page }) => {
	await page.emulateMedia({ reducedMotion: 'no-preference' });
	await openQuote(page, 390);
	await page.locator('[data-inline-comment-block-id="article-101"]').evaluate((root) => {
		const host = root.closest<HTMLElement>('.bn-block-outer');
		if (host === null) throw new Error('본문 블록이 없습니다.');
		host.style.marginTop = '2400px';
		window.scrollTo({ top: 0, behavior: 'instant' });
	});
	await page.evaluate(() => {
		const movement = new Promise<number>((resolve) => {
			const reopen = () => {
				if (window.scrollY === 0 || document.querySelector('dialog:modal') !== null) return;
				window.removeEventListener('scroll', reopen);
				const button = document.querySelector<HTMLButtonElement>('[aria-label="전체 댓글 1개 보기"]');
				if (button === null) throw new Error('전체 댓글 버튼이 없습니다.');
				button.click();
				const waitForOpen = () => {
					if (document.querySelector('dialog:modal') === null) {
						window.requestAnimationFrame(waitForOpen);
						return;
					}
					const positions = [window.scrollY];
					const sample = () => {
						positions.push(window.scrollY);
						if (positions.length === 12) resolve(Math.max(...positions) - Math.min(...positions));
						else window.requestAnimationFrame(sample);
					};
					window.requestAnimationFrame(sample);
				};
				waitForOpen();
			};
			window.addEventListener('scroll', reopen);
		});
		Reflect.set(window, '__commentReturnMovement', movement);
	});
	await page.getByRole('button', { name: '본문으로 이동', exact: true }).click();
	const movement = await page.evaluate(async () => {
		const result: unknown = await Reflect.get(window, '__commentReturnMovement');
		if (typeof result !== 'number') throw new Error('스크롤 측정값이 없습니다.');
		return result;
	});
	await expect(page.locator('dialog:modal')).toHaveCount(1);
	expect(movement).toBeLessThan(1);
});

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
		await page.evaluate(() => {
			const selector = '[data-inline-comment-highlight][data-inline-comment-anchor-id="91"]';
			const previous = new Set(document.querySelectorAll(selector));
			Reflect.set(window, '__highlightObservedAfterResize', false);
			const observer = new MutationObserver(() => {
				const visibleNewLine = [...document.querySelectorAll(selector)].some(
					(line) => !previous.has(line) && getComputedStyle(line, '::before').content === '""',
				);
				if (!visibleNewLine) return;
				Reflect.set(window, '__highlightObservedAfterResize', true);
				observer.disconnect();
			});
			observer.observe(document.body, { subtree: true, childList: true, attributes: true });
			window.addEventListener('pagehide', () => observer.disconnect(), { once: true });
			window.dispatchEvent(new Event('resize'));
		});
		await expect
			.poll(() => page.evaluate(() => Reflect.get(window, '__highlightObservedAfterResize') === true))
			.toBe(true);
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
