import { codeToHtml } from 'shiki';
import { createCssVariablesTheme } from 'shiki/core';

const PLAIN_TEXT_LANGUAGES = new Set(['', 'none', 'plain', 'plaintext', 'text', 'txt']);

const POST_CODE_THEME = createCssVariablesTheme({
	name: 'rilog-code',
	variablePrefix: '--code-syntax-',
});

export const highlightPostCode = async (code: string, language: string): Promise<string | null> => {
	const normalizedLanguage = language.trim().toLowerCase();
	if (PLAIN_TEXT_LANGUAGES.has(normalizedLanguage)) {
		return null;
	}

	try {
		return await codeToHtml(code, {
			lang: normalizedLanguage,
			theme: POST_CODE_THEME,
		});
	} catch {
		return null;
	}
};
