import { ko } from '@blocknote/core/locales';

export const slashMenuDictionary = {
	...ko.slash_menu,
	check_list: {
		...ko.slash_menu.check_list,
		title: '할 일 목록',
		aliases: [...ko.slash_menu.check_list.aliases, '할일목록', 'checklists'],
	},
	toggle_list: {
		...ko.slash_menu.toggle_list,
		title: '토글 목록',
		aliases: [...ko.slash_menu.toggle_list.aliases, 'togglelists', '리스트'],
	},
	bullet_list: {
		...ko.slash_menu.bullet_list,
		aliases: [...ko.slash_menu.bullet_list.aliases, '글머리기호목록', 'bulletlists', '리스트'],
	},
	numbered_list: {
		...ko.slash_menu.numbered_list,
		aliases: [...ko.slash_menu.numbered_list.aliases, '번호매기기목록', 'numberlists', '리스트'],
	},
	table: { ...ko.slash_menu.table, aliases: [...ko.slash_menu.table.aliases, 'table'] },
};
