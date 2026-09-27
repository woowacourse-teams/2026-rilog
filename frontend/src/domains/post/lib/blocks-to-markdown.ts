import { ServerBlockNoteEditor } from '@blocknote/server-util';

import type { Block } from '@blocknote/core';

const editor = ServerBlockNoteEditor.create();

export const blocksToMarkdown = (blocks: Block[]): Promise<string> => editor.blocksToMarkdownLossy(blocks);
