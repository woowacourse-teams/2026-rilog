export const buildPostDetailPath = (postId: string) => {
	const normalizedPostId = postId.trim();

	if (normalizedPostId.length === 0) {
		throw new Error('게시글 ID가 필요합니다.');
	}

	return `/posts/${encodeURIComponent(normalizedPostId)}`;
};
