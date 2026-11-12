import { filterSuggestionItems } from '@blocknote/core/extensions';

const removeWhitespace = (value: string): string => value.replace(/\s+/g, '');

export const filterSlashMenuItems = <T extends { title: string; aliases?: readonly string[] }>(
	items: T[],
	query: string,
): T[] =>
	filterSuggestionItems(
		items.map((item) => ({
			title: removeWhitespace(item.title),
			aliases: item.aliases?.map(removeWhitespace),
			item,
		})),
		removeWhitespace(query),
	).map(({ item }) => item);
