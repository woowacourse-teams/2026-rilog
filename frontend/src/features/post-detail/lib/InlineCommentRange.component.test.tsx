import { afterEach, describe, expect, it } from 'vitest';

import { findInlineCommentRoot, restoreInlineCommentRange } from './inline-comment-range';

const renderArticle = (): HTMLElement => {
	document.body.innerHTML = `
		<article>
			<div data-inline-comment-root data-inline-comment-block-id="plain:block">앞 <strong>😀강조</strong><a href="#link"> 링크</a></div>
			<div data-inline-comment-root data-inline-comment-block-id="empty"></div>
		</article>
	`;
	const article = document.querySelector('article');
	if (article === null) {
		throw new Error('게시글 본문 fixture를 만들 수 없습니다.');
	}

	return article;
};

afterEach(() => {
	document.body.innerHTML = '';
});

describe('restoreInlineCommentRange', () => {
	it('여러 Text node와 surrogate pair에 걸친 UTF-16 range를 복원한다', () => {
		const article = renderArticle();
		const root = findInlineCommentRoot(article, 'plain:block');
		if (root === null) {
			throw new Error('댓글 root를 찾을 수 없습니다.');
		}

		const range = restoreInlineCommentRange(root, { startOffset: 2, endOffset: 6 });

		expect(range?.toString()).toBe('😀강조');
	});

	it('Text node 경계와 마지막 문자까지의 end-exclusive range를 복원한다', () => {
		const article = renderArticle();
		const root = findInlineCommentRoot(article, 'plain:block');
		if (root === null) {
			throw new Error('댓글 root를 찾을 수 없습니다.');
		}

		expect(restoreInlineCommentRange(root, { startOffset: 0, endOffset: 2 })?.toString()).toBe('앞 ');
		expect(restoreInlineCommentRange(root, { startOffset: 6, endOffset: 9 })?.toString()).toBe(' 링크');
	});

	it.each([
		{ startOffset: -1, endOffset: 1 },
		{ startOffset: 1, endOffset: 1 },
		{ startOffset: 2, endOffset: 1 },
		{ startOffset: 0, endOffset: 20 },
		{ startOffset: 0.5, endOffset: 2 },
	])('유효하지 않은 range $startOffset..$endOffset은 복원하지 않는다', (range) => {
		const article = renderArticle();
		const root = findInlineCommentRoot(article, 'plain:block');
		if (root === null) {
			throw new Error('댓글 root를 찾을 수 없습니다.');
		}

		expect(restoreInlineCommentRange(root, range)).toBeNull();
	});

	it('빈 root는 복원하지 않고 blockId는 exact match로 찾는다', () => {
		const article = renderArticle();
		const emptyRoot = findInlineCommentRoot(article, 'empty');
		if (emptyRoot === null) {
			throw new Error('빈 댓글 root를 찾을 수 없습니다.');
		}

		expect(findInlineCommentRoot(article, 'plain:block')).not.toBeNull();
		expect(findInlineCommentRoot(article, 'plain')).toBeNull();
		expect(restoreInlineCommentRange(emptyRoot, { startOffset: 0, endOffset: 1 })).toBeNull();
	});
});
