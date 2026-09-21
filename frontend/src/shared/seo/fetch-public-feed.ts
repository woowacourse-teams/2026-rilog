import type { PostItemResponse } from '@/shared/api/feeds/types';

export const fetchPublicFeedPosts = async (size: number, revalidate = 600): Promise<PostItemResponse[]> => {
	const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
	if (apiBase === undefined || apiBase === '') throw new Error('Feed API URL is missing');

	const res = await fetch(`${apiBase.replace(/\/$/, '')}/v1/feeds/posts?page=0&size=${size}`, {
		next: { revalidate },
	});
	if (!res.ok) throw new Error(`Feed API returned ${res.status}`);
	const body = (await res.json()) as { data?: { posts?: PostItemResponse[] } };
	if (!Array.isArray(body.data?.posts)) throw new Error('Feed API response is invalid');
	return body.data.posts;
};
