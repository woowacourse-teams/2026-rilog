import type { PostFeedItem } from '@/domains/post/model/post-feed';

// page 기반 피드에서는 새 게시글 발행으로 다음 페이지 경계가 밀려 같은 게시글이 다시 포함될 수 있움
// 따라서 무한 스크롤에서 동일한 게시글을 한 번만 보여 주도록 post id 기준으로 중복 게시글 제거해주는 함수
export const deduplicatePostFeedItems = (items: PostFeedItem[]): PostFeedItem[] => {
	const seenPostIds = new Set<number>();

	return items.filter(({ id }) => {
		if (seenPostIds.has(id)) {
			return false;
		}

		seenPostIds.add(id);
		return true;
	});
};
