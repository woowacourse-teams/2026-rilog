import type { EditorEntrySource } from '../model/analytics-event';

const EDITOR_ENTRY_CONTEXT_KEY = 'rilog.editor-entry-context';

export const recordEditorEntryContext = (entrySource: EditorEntrySource) => {
	window.sessionStorage.setItem(EDITOR_ENTRY_CONTEXT_KEY, entrySource);
};

export const consumeEditorEntryContext = (): EditorEntrySource => {
	const entrySource = window.sessionStorage.getItem(EDITOR_ENTRY_CONTEXT_KEY);
	window.sessionStorage.removeItem(EDITOR_ENTRY_CONTEXT_KEY);

	return entrySource === 'sidebar' || entrySource === 'post_detail_edit' || entrySource === 'draft_list'
		? entrySource
		: 'direct';
};
