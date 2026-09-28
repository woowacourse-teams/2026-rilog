import { blocksToMarkdown } from '@/domains/post/lib/blocks-to-markdown';
import { isBlockNoteDocument } from '@/domains/post/lib/validate-blocknote-document';
import { isRecord } from '@/shared/api/response-validation';
import { buildPostDetailPath } from '@/shared/routes/app-routes';
import { toAbsoluteSiteUrl } from '@/shared/seo/site-url';
import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

export const revalidate = 600;

export const GET = async (_request: Request, { params }: { params: Promise<{ slug: string; postId: string }> }) => {
	const { slug, postId } = await params;
	const normalizedSlug = stripAtPrefix(slug);
	const numericId = Number(postId);

	if (!Number.isSafeInteger(numericId) || numericId < 1 || normalizedSlug.length === 0) {
		return new Response('Not Found', { status: 404 });
	}

	const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
	if (apiBase === undefined || apiBase === '') {
		return new Response('Markdown unavailable', { status: 503 });
	}

	try {
		const apiUrl = `${apiBase.replace(/\/+$/, '')}/v1/blogs/${encodeURIComponent(normalizedSlug)}/posts/${numericId}`;
		const res = await fetch(apiUrl, {
			next: { revalidate: 600 },
			signal: AbortSignal.timeout(10_000),
		});

		if (res.status === 403 || res.status === 404) {
			return new Response('Not Found', { status: 404 });
		}
		if (!res.ok) {
			return new Response('Markdown unavailable', { status: 503 });
		}

		const body: unknown = await res.json();
		if (!isRecord(body) || !isRecord(body.data)) {
			return new Response('Markdown unavailable', { status: 503 });
		}
		const data = body.data;
		if (
			typeof data.title !== 'string' ||
			!isBlockNoteDocument(data.content) ||
			typeof data.publishedAt !== 'string' ||
			!isRecord(data.owner) ||
			typeof data.owner.slug !== 'string' ||
			!isRecord(data.author) ||
			(data.author.nickname !== undefined &&
				data.author.nickname !== null &&
				typeof data.author.nickname !== 'string') ||
			(data.category !== undefined && data.category !== null && typeof data.category !== 'string')
		) {
			return new Response('Markdown unavailable', { status: 503 });
		}

		if (data.owner.slug !== normalizedSlug) {
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

		const markdown = await blocksToMarkdown(data.content);
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
		return new Response('Markdown unavailable', { status: 503 });
	}
};
