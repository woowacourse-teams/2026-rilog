import { codeBlockOptions } from '@blocknote/code-block';
import { BlockNoteSchema, createCodeBlockSpec, createHeadingBlockSpec } from '@blocknote/core';
import { createHighlighter } from 'shiki';

import type { CodeBlockOptions } from '@blocknote/core';

const LIGHT_CODE_BLOCK_OPTIONS = {
	...codeBlockOptions,
	defaultLanguage: 'text',
	createHighlighter: () => createHighlighter({ langs: [], themes: ['github-light'] }),
} satisfies CodeBlockOptions;

export const POST_WRITE_SCHEMA = BlockNoteSchema.create().extend({
	blockSpecs: {
		codeBlock: createCodeBlockSpec(LIGHT_CODE_BLOCK_OPTIONS),
		heading: createHeadingBlockSpec({ levels: [1, 2, 3, 4] }),
	},
});
