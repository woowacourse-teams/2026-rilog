import type { Block, DefaultBlockSchema } from '@blocknote/core';
import type { multiColumnSchema } from '@blocknote/xl-multi-column';

/** Saved post blocks include BlockNote's default blocks and multi-column containers. */
export type PostContentBlock = Block<DefaultBlockSchema & typeof multiColumnSchema.blockSchema>;
