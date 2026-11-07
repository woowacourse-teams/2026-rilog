import 'server-only';

import { unstable_cache } from 'next/cache';

import type { PostContentBlock } from '@/domains/post/model/post-content';

import { renderPostDetailContent } from './render-post-detail-content';

// 게시글 ID와 본문 블록이 캐시 키에 포함되어 본문 수정 시 새 HTML을 생성한다.
export const getCachedPostDetailContent = unstable_cache(
	(_postId: number, blocks: PostContentBlock[]) => renderPostDetailContent(blocks),
	['post-detail-content-html'],
	{ revalidate: false },
);
