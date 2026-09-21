import type { Block } from '@blocknote/core';

import { blocksToMarkdown } from '@/domains/post/lib/blocks-to-markdown';
import type { PostDetailResponse } from '@/shared/api/posts/types';
import { buildPostDetailPath } from '@/shared/routes/app-routes';
import { toAbsoluteSiteUrl } from '@/shared/seo/site-url';

export const revalidate = 600;

export const GET = async (_request: Request, { params }: { params: Promise<{ slug: string; postId: string }> }) => {
	const { slug, postId } = await params;
	const numericId = Number(postId);

	if (!Number.isSafeInteger(numericId) || numericId < 1) {
		return new Response('Not Found', { status: 404 });
	}

	const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
	if (apiBase === undefined || apiBase === '') {
		return new Response('Not Found', { status: 404 });
	}

	try {
		const res = await fetch(`${apiBase}/v1/posts/${numericId}`, {
			next: { revalidate: 600 },
		});

		if (!res.ok) {
			return new Response('Not Found', { status: 404 });
		}

		const body = (await res.json()) as { data?: PostDetailResponse };

		const data = body.data;
		if (!data || !Array.isArray(data.content) || data.owner?.slug !== slug.replace(/^@/, '')) {
			return new Response('Not Found', { status: 404 });
		}

		const canonical = toAbsoluteSiteUrl(buildPostDetailPath(data.owner.slug, String(numericId)));

		const frontmatter = [
			'---',
			`title: ${JSON.stringify(data.title)}`,
			`author: ${JSON.stringify(data.author.nickname ?? '')}`,
			`canonical: ${JSON.stringify(canonical)}`,
			`publishedAt: ${JSON.stringify(data.publishedAt)}`,
			`category: ${JSON.stringify(data.category ?? '')}`,
			'---',
			'',
		].join('\n');

		const markdown = await blocksToMarkdown(data.content as Block[]);
		const text = `${frontmatter}${markdown}\n`;

		return new Response(text, {
			headers: {
				'Content-Type': 'text/markdown; charset=utf-8',
				'Cache-Control': 'public, max-age=600, stale-while-revalidate=3600',
				Link: `<${canonical}>; rel="canonical"`,
				'X-Robots-Tag': 'noindex',
			},
		});
	} catch {
		return new Response('Not Found', { status: 404 });
	}
};
