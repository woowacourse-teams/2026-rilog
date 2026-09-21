import type { PostItemResponse } from '@/shared/api/feeds/types';

export const fetchPublicFeedPosts = async (size: number, revalidate = 600): Promise<PostItemResponse[]> => {
	const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
	if (apiBase === undefined || apiBase === '') return [];

	try {
		const res = await fetch(`${apiBase}/v1/feeds/posts?page=0&size=${size}`, {
			next: { revalidate },
		});
		if (!res.ok) return [];
		const body = (await res.json()) as { data?: { posts?: PostItemResponse[] } };
		return body.data?.posts ?? [];
	} catch {
		return [];
	}
};
