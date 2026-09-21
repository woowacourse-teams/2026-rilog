import type { PostItemResponse } from '@/shared/api/feeds/types';
import { SITE_DESCRIPTION, SITE_NAME } from '@/shared/seo/create-social-metadata';
import { fetchPublicFeedPosts } from '@/shared/seo/fetch-public-feed';
import { toAbsoluteSiteUrl } from '@/shared/seo/site-url';

export const revalidate = 600;

const escapeXml = (value: string) =>
	value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
		.replaceAll("'", '&apos;');

const buildRss = (posts: PostItemResponse[]) => {
	const lastBuildDate = posts[0]?.publishedAt ? new Date(posts[0].publishedAt).toUTCString() : new Date().toUTCString();
	const siteUrl = toAbsoluteSiteUrl('/feeds');

	const items = posts
		.map((post) => {
			const link = toAbsoluteSiteUrl(`/@${encodeURIComponent(post.owner.slug)}/posts/${post.postId}`);
			const pubDate = new Date(post.publishedAt).toUTCString();
			const title = escapeXml(post.title ?? '');
			const author = escapeXml(post.author.nickname ?? '');
			const category = post.category ? `<category>${escapeXml(post.category)}</category>` : '';
			const description = escapeXml(`${author}의 글 · ${post.category ?? ''}`.trim());

			return `  <item>
    <title>${title}</title>
    <link>${link}</link>
    <guid isPermaLink="true">${link}</guid>
    <pubDate>${pubDate}</pubDate>
    <author>${author}</author>
    ${category}
    <description>${description}</description>
  </item>`;
		})
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
  <title>${escapeXml(SITE_NAME)}</title>
  <link>${siteUrl}</link>
  <description>${escapeXml(SITE_DESCRIPTION)}</description>
  <language>ko-KR</language>
  <lastBuildDate>${lastBuildDate}</lastBuildDate>
  <atom:link href="${toAbsoluteSiteUrl('/rss.xml')}" rel="self" type="application/rss+xml" />
${items}
</channel>
</rss>`;
};

export const GET = async () => {
	const posts = await fetchPublicFeedPosts(50, 600);
	const xml = buildRss(posts);

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
		},
	});
};
