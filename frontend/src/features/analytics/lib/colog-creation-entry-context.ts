import type { CologCreationEntrySource } from '../model/analytics-event';

const COLOG_CREATION_ENTRY_CONTEXT_KEY = 'rilog.colog-creation-entry-context';

export const recordCologCreationEntryContext = (entrySource: CologCreationEntrySource) => {
	window.sessionStorage.setItem(COLOG_CREATION_ENTRY_CONTEXT_KEY, entrySource);
};

export const consumeCologCreationEntryContext = (): CologCreationEntrySource => {
	const entrySource = window.sessionStorage.getItem(COLOG_CREATION_ENTRY_CONTEXT_KEY);
	window.sessionStorage.removeItem(COLOG_CREATION_ENTRY_CONTEXT_KEY);

	return entrySource === 'sidebar' ? entrySource : 'direct';
};
