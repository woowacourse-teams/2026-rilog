export const revalidate = 3600;

const SITEMAP_API_PATH = '/v1/sitemap.xml';

export const GET = async () => {
	const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;
	if (apiBase === undefined || apiBase === '') {
		return new Response('Sitemap unavailable', { status: 503 });
	}

	try {
		const response = await fetch(`${apiBase.replace(/\/$/, '')}${SITEMAP_API_PATH}`, {
			next: { revalidate: 3600 },
		});

		if (!response.ok) {
			return new Response('Sitemap unavailable', { status: 503 });
		}

		return new Response(await response.text(), {
			headers: {
				'Content-Type': 'application/xml; charset=utf-8',
				'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
			},
		});
	} catch {
		return new Response('Sitemap unavailable', { status: 503 });
	}
};
