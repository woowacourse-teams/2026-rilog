import { ServerBlockNoteEditor } from '@blocknote/server-util';

import type { Block } from '@blocknote/core';

import { removeEmptyUploadBlocks } from './remove-empty-upload-blocks';

const editor = ServerBlockNoteEditor.create();

export const blocksToMarkdown = (blocks: Block[]): Promise<string> =>
	editor.blocksToMarkdownLossy(removeEmptyUploadBlocks(blocks));
