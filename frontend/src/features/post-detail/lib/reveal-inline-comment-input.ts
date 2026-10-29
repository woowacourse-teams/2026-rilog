export function revealInlineCommentInput(input: Element | null) {
	if (
		!(input instanceof HTMLTextAreaElement) ||
		document.activeElement !== input ||
		input.closest('[data-mobile-comment-composer]')
	) {
		return;
	}
	const sheet = input.closest('[data-comment-bottom-sheet]');
	if (sheet === null || input.closest('dialog') !== sheet.closest('dialog')) return;
	input.closest<HTMLElement>('[data-inline-comment-composer]')?.scrollIntoView?.({ block: 'nearest' });
}
