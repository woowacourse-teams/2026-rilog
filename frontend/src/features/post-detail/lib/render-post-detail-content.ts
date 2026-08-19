import { ServerBlockNoteEditor } from '@blocknote/server-util';

import type { Block } from '@blocknote/core';

export const renderPostDetailContent = async (blocks: Block[]): Promise<string> => {
	const editor = ServerBlockNoteEditor.create();
	return editor.blocksToFullHTML(blocks);
};
