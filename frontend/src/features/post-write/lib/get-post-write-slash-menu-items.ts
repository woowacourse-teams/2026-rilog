import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core/extensions';
import { getDefaultReactSlashMenuItems } from '@blocknote/react';

import type { PostWriteBlockNoteEditor } from './post-write-schema';

export const getPostWriteSlashMenuItems = (editor: PostWriteBlockNoteEditor) => {
	const items = getDefaultReactSlashMenuItems(editor);
	const heading4Index = items.findIndex((item) => 'key' in item && item.key === 'heading_4');
	if (heading4Index === -1) return items;
	const [heading4] = items.splice(heading4Index, 1);
	const heading3Index = items.findIndex((item) => 'key' in item && item.key === 'heading_3');
	items.splice(heading3Index + 1, 0, heading4);
	const toggleHeading3Index = items.findIndex((item) => 'key' in item && item.key === 'toggle_heading_3');
	const toggleHeading4 = {
		...heading4,
		key: 'toggle_heading_4',
		title: '접을 수 있는 제목4',
		subtext: '내용을 표시하거나 숨길 수 있는 하위 소단락 제목',
		group: editor.dictionary.slash_menu.toggle_heading_3.group,
		aliases: [...editor.dictionary.slash_menu.heading_4.aliases, '접기', '토글'],
		badge: undefined,
		onItemClick: () => {
			insertOrUpdateBlockForSlashMenu(editor, {
				type: 'heading',
				props: { level: 4, isToggleable: true },
			});
		},
	};
	items.splice(toggleHeading3Index + 1, 0, toggleHeading4);
	return items;
};
