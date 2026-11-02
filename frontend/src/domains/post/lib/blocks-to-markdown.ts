import { BlockNoteSchema } from '@blocknote/core';
import { ServerBlockNoteEditor } from '@blocknote/server-util';
import { withMultiColumn } from '@blocknote/xl-multi-column';

import type { PostContentBlock } from '@/domains/post/model/post-content';

import { removeEmptyUploadBlocks } from './remove-empty-upload-blocks';

const editor = ServerBlockNoteEditor.create({ schema: withMultiColumn(BlockNoteSchema.create()) });

export const blocksToMarkdown = (blocks: PostContentBlock[]): Promise<string> =>
	editor.blocksToMarkdownLossy(removeEmptyUploadBlocks(blocks));
