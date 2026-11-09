import 'server-only';

import { join } from 'node:path';

import type { PostContentBlock } from '@/domains/post/model/post-content';

import { readOrRenderPostDetailContent } from './post-detail-content-file-cache';
import { renderPostDetailContent } from './render-post-detail-content';

const CACHE_DIRECTORY = join(process.cwd(), '.post-detail-content-cache');

export const getCachedPostDetailContent = (postId: number, blocks: PostContentBlock[]): Promise<string> =>
	readOrRenderPostDetailContent(CACHE_DIRECTORY, postId, blocks, renderPostDetailContent);
