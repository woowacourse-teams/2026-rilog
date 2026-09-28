import { codeBlockOptions } from '@blocknote/code-block';

export const RECENT_CODE_LANGUAGE_KEY = 'rilog:recent-code-language';

const supportedLanguages = codeBlockOptions.supportedLanguages;

export const getRecentCodeLanguage = (): string => {
	try {
		const language = window.localStorage.getItem(RECENT_CODE_LANGUAGE_KEY);
		return language !== null && Object.hasOwn(supportedLanguages, language) ? language : 'text';
	} catch {
		return 'text';
	}
};

export const saveRecentCodeLanguage = (language: string): void => {
	if (!Object.hasOwn(supportedLanguages, language)) {
		return;
	}

	try {
		window.localStorage.setItem(RECENT_CODE_LANGUAGE_KEY, language);
	} catch {
		// Storage can be unavailable in private browsing; the editor still works.
	}
};
