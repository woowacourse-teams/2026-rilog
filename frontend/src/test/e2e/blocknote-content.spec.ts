import { readFile } from 'node:fs/promises';

import { expect, test } from '@playwright/test';

import type { Page } from '@playwright/test';

const SHARED_CONTENT_STYLES = new URL('../../shared/styles/blocknote-content.css', import.meta.url);
const POST_DETAIL_STYLES = new URL(
	'../../app/(with-sidebar)/(with-footer)/[slug]/posts/[postId]/post-detail.css',
	import.meta.url,
);
const POST_WRITE_STYLES = new URL('../../features/post-write/styles/blocknote-theme.css', import.meta.url);

const block = (contentType: string) => `
	<div class="bn-block-outer">
		<div class="bn-block">
			<div class="bn-block-content" data-content-type="${contentType}"></div>
		</div>
	</div>
`;

const renderBlockNoteFixture = async (
	page: Page,
	rootClass: 'post-detail-body' | 'post-write-blocknote',
	contentTypes: string[],
) => {
	const [sharedStyles, rootStyles] = await Promise.all([
		readFile(SHARED_CONTENT_STYLES, 'utf8'),
		readFile(rootClass === 'post-detail-body' ? POST_DETAIL_STYLES : POST_WRITE_STYLES, 'utf8'),
	]);

	await page.setContent(
		`<div class="${rootClass}"><div class="bn-block-group">${contentTypes.map(block).join('')}</div></div>`,
	);
	await page.addStyleTag({
		content: `${sharedStyles}\n${rootStyles.replace("@import '@blocknote/core/style.css';", '')}`,
	});
};

const getPadding = (page: Page, index: number) =>
	page
		.locator('.bn-block-outer')
		.nth(index)
		.evaluate((element) => {
			const style = getComputedStyle(element);

			return { top: style.paddingTop, bottom: style.paddingBottom };
		});

const ROOT_SPACING = [
	{ rootClass: 'post-detail-body' as const, outer: '9.6px', shared: '3.2px' },
	{ rootClass: 'post-write-blocknote' as const, outer: '8px', shared: '0px' },
];

const LIST_TYPES = ['bulletListItem', 'numberedListItem', 'checkListItem', 'toggleListItem'];

test.describe('BlockNote 콘텐츠 여백', () => {
	for (const { rootClass, outer, shared } of ROOT_SPACING) {
		for (const listType of LIST_TYPES) {
			test(`${rootClass}의 연속된 ${listType} 여백을 같은 타입끼리만 합친다`, async ({ page }) => {
				await renderBlockNoteFixture(page, rootClass, [listType, listType, listType]);

				await expect.poll(() => getPadding(page, 0)).toEqual({ top: outer, bottom: shared });
				await expect.poll(() => getPadding(page, 1)).toEqual({ top: shared, bottom: shared });
				await expect.poll(() => getPadding(page, 2)).toEqual({ top: shared, bottom: outer });
			});
		}

		test(`${rootClass}에서 서로 다른 리스트 타입의 기본 여백을 유지한다`, async ({ page }) => {
			await renderBlockNoteFixture(page, rootClass, ['bulletListItem', 'checkListItem']);

			await expect.poll(() => getPadding(page, 0)).toEqual({ top: outer, bottom: outer });
			await expect.poll(() => getPadding(page, 1)).toEqual({ top: outer, bottom: outer });
		});
	}

	test('이미지와 구분선에는 특수 블록 공통 여백을 적용하지 않는다', async ({ page }) => {
		await renderBlockNoteFixture(page, 'post-write-blocknote', [
			'paragraph',
			'quote',
			'image',
			'paragraph',
			'quote',
			'divider',
			'paragraph',
		]);

		await expect.poll(() => getPadding(page, 1)).toEqual({ top: '16px', bottom: '16px' });
		await expect.poll(() => getPadding(page, 2)).toEqual({ top: '0px', bottom: '0px' });
		await expect.poll(() => getPadding(page, 4)).toEqual({ top: '16px', bottom: '16px' });
		await expect.poll(() => getPadding(page, 5)).toEqual({ top: '0px', bottom: '0px' });
	});

	test('나머지 특수 블록은 데스크톱과 모바일 공통 여백을 유지한다', async ({ page }) => {
		await renderBlockNoteFixture(page, 'post-write-blocknote', ['paragraph', 'quote', 'paragraph']);
		await expect.poll(() => getPadding(page, 1)).toEqual({ top: '16px', bottom: '16px' });

		await page.setViewportSize({ width: 390, height: 844 });
		await expect.poll(() => getPadding(page, 1)).toEqual({ top: '12px', bottom: '12px' });
	});
});
