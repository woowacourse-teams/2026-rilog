import type { Block } from '@blocknote/core';

import { blocksToMarkdown } from '@/domains/post/lib/blocks-to-markdown';
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

		const body = (await res.json()) as {
			data?: {
				title?: string;
				content?: Block[];
				author?: { nickname?: string; slug?: string };
				blog?: { slug?: string };
				category?: string | null;
				publishedAt?: string;
				updatedAt?: string;
			};
		};

		const data = body.data;
		if (!data || !Array.isArray(data.content)) {
			return new Response('Not Found', { status: 404 });
		}

		const canonical = toAbsoluteSiteUrl(
			`/@${encodeURIComponent(data.blog?.slug ?? slug.replace(/^@/, ''))}/posts/${numericId}`,
		);
		const title = data.title ?? '';
		const author = data.author?.nickname ?? '';
		const publishedAt = data.publishedAt ?? '';
		const updatedAt = data.updatedAt ?? publishedAt;

		const frontmatter = [
			'---',
			`title: "${title.replaceAll('"', '\\"')}"`,
			`author: "${author.replaceAll('"', '\\"')}"`,
			`canonical: "${canonical}"`,
			`publishedAt: "${publishedAt}"`,
			`updatedAt: "${updatedAt}"`,
			`category: "${data.category ?? ''}"`,
			'---',
			'',
		].join('\n');

		const markdown = blocksToMarkdown(data.content);
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
