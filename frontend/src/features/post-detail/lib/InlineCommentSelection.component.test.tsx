import { afterEach, describe, expect, it } from 'vitest';

import { createInlineCommentSelectionDraft } from './inline-comment-selection';

const renderArticle = (html: string): HTMLElement => {
	document.body.innerHTML = `<article data-post-detail-content>${html}</article>`;
	const article = document.querySelector<HTMLElement>('[data-post-detail-content]');
	if (article === null) {
		throw new Error('게시글 본문 fixture를 만들 수 없습니다.');
	}

	return article;
};

const selectRange = (startNode: Node, startOffset: number, endNode: Node, endOffset: number): Selection => {
	const range = document.createRange();
	range.setStart(startNode, startOffset);
	range.setEnd(endNode, endOffset);

	const selection = window.getSelection();
	if (selection === null) {
		throw new Error('Selection을 사용할 수 없습니다.');
	}

	selection.removeAllRanges();
	selection.addRange(range);
	return selection;
};

afterEach(() => {
	window.getSelection()?.removeAllRanges();
	document.body.innerHTML = '';
});

describe('createInlineCommentSelectionDraft', () => {
	it('inline markup을 가로지른 선택을 blockId와 UTF-16 offset으로 변환한다', () => {
		const article = renderArticle(`
			<div data-inline-comment-root data-inline-comment-block-id="block-1">앞 <strong>강조</strong><a href="#link"> 링크</a></div>
		`);
		const root = article.querySelector<HTMLElement>('[data-inline-comment-root]');
		const firstText = root?.firstChild;
		const linkText = root?.querySelector('a')?.firstChild;
		if (firstText === null || firstText === undefined || linkText === null || linkText === undefined) {
			throw new Error('텍스트 fixture를 찾을 수 없습니다.');
		}

		const draft = createInlineCommentSelectionDraft(selectRange(firstText, 1, linkText, 3), article);

		expect(draft).toMatchObject({
			blockId: 'block-1',
			startOffset: 1,
			endOffset: 7,
			selectedText: ' 강조 링크',
		});
		expect(draft?.range.toString()).toBe(' 강조 링크');
	});

	it('surrogate pair를 두 UTF-16 code unit으로 계산한다', () => {
		const article = renderArticle(
			'<div data-inline-comment-root data-inline-comment-block-id="emoji-block">가😀댓글나</div>',
		);
		const textNode = article.querySelector('[data-inline-comment-root]')?.firstChild;
		if (textNode === null || textNode === undefined) {
			throw new Error('emoji fixture를 찾을 수 없습니다.');
		}

		const draft = createInlineCommentSelectionDraft(selectRange(textNode, 1, textNode, 5), article);

		expect(draft).toMatchObject({
			blockId: 'emoji-block',
			startOffset: 1,
			endOffset: 5,
			selectedText: '😀댓글',
		});
	});

	it('서로 다른 block root를 가로지른 선택은 거부한다', () => {
		const article = renderArticle(`
			<div data-inline-comment-root data-inline-comment-block-id="block-1">첫 블록</div>
			<div data-inline-comment-root data-inline-comment-block-id="block-2">둘째 블록</div>
		`);
		const roots = article.querySelectorAll('[data-inline-comment-root]');
		const startNode = roots[0]?.firstChild;
		const endNode = roots[1]?.firstChild;
		if (startNode === null || startNode === undefined || endNode === null || endNode === undefined) {
			throw new Error('블록 fixture를 찾을 수 없습니다.');
		}

		expect(createInlineCommentSelectionDraft(selectRange(startNode, 0, endNode, 2), article)).toBeNull();
	});

	it('접힌 선택과 공백만 있는 선택을 거부한다', () => {
		const article = renderArticle('<div data-inline-comment-root data-inline-comment-block-id="block-1">   본문</div>');
		const textNode = article.querySelector('[data-inline-comment-root]')?.firstChild;
		if (textNode === null || textNode === undefined) {
			throw new Error('텍스트 fixture를 찾을 수 없습니다.');
		}

		expect(createInlineCommentSelectionDraft(selectRange(textNode, 1, textNode, 1), article)).toBeNull();
		expect(createInlineCommentSelectionDraft(selectRange(textNode, 0, textNode, 3), article)).toBeNull();
	});

	it('지원 root 밖의 선택과 blockId 없는 root를 거부한다', () => {
		const article = renderArticle(`
			<p>지원하지 않는 본문</p>
			<div data-inline-comment-root>blockId 없는 본문</div>
		`);
		const unsupportedText = article.querySelector('p')?.firstChild;
		const missingBlockIdText = article.querySelector('[data-inline-comment-root]')?.firstChild;
		if (
			unsupportedText === null ||
			unsupportedText === undefined ||
			missingBlockIdText === null ||
			missingBlockIdText === undefined
		) {
			throw new Error('지원 여부 fixture를 찾을 수 없습니다.');
		}

		expect(createInlineCommentSelectionDraft(selectRange(unsupportedText, 0, unsupportedText, 2), article)).toBeNull();
		expect(
			createInlineCommentSelectionDraft(selectRange(missingBlockIdText, 0, missingBlockIdText, 2), article),
		).toBeNull();
	});
});
