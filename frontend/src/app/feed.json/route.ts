import { SITE_DESCRIPTION, SITE_NAME } from '@/shared/seo/create-social-metadata';
import { fetchPublicFeedPosts } from '@/shared/seo/fetch-public-feed';
import { toAbsoluteSiteUrl } from '@/shared/seo/site-url';

export const revalidate = 600;

export const GET = async () => {
	const posts = await fetchPublicFeedPosts(50, 600);

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
			date_published: new Date(post.publishedAt).toISOString(),
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
