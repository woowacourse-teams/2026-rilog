import { SITE_DESCRIPTION, SITE_NAME } from '@/shared/seo/create-social-metadata';
import { fetchPublicFeedPosts } from '@/shared/seo/fetch-public-feed';
import { toAbsoluteSiteUrl } from '@/shared/seo/site-url';
import { toApiUtcISOString } from '@/shared/utils/parse-api-utc-date';

export const revalidate = 600;
export const dynamic = 'force-dynamic';

export const GET = async () => {
	let posts;
	try {
		posts = await fetchPublicFeedPosts(50, 600);
	} catch {
		return new Response('Feed unavailable', { status: 503 });
	}

	const feed = {
		version: 'https://jsonfeed.org/version/1.1',
		title: SITE_NAME,
		home_page_url: toAbsoluteSiteUrl('/feeds'),
		feed_url: toAbsoluteSiteUrl('/feed.json'),
		description: SITE_DESCRIPTION,
		language: 'ko-KR',
		items: posts.map((post) => ({
			id: toAbsoluteSiteUrl(`/@${encodeURIComponent(post.owner.slug)}/posts/${post.postId}`),
			url: toAbsoluteSiteUrl(`/@${encodeURIComponent(post.owner.slug)}/posts/${post.postId}`),
			title: post.title,
			content_text: post.title,
			date_published: toApiUtcISOString(post.publishedAt),
			authors: [{ name: post.author.nickname, url: toAbsoluteSiteUrl(`/@${encodeURIComponent(post.author.slug)}`) }],
			tags: post.category ? [post.category] : [],
		})),
	};

	return new Response(JSON.stringify(feed, null, 2), {
		headers: {
			'Content-Type': 'application/feed+json; charset=utf-8',
			'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
		},
	});
};
