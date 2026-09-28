import { afterEach, describe, expect, it, vi } from 'vitest';

import { GET } from './route';

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('sitemap.xml proxy', () => {
	it('백엔드 XML 원문과 XML Content-Type을 전달한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.test/');
		const xml = '<?xml version="1.0"?><urlset><url><loc>https://www.rilog.kr/@writer</loc></url></urlset>';
		const fetchMock = vi.fn().mockResolvedValue(new Response(xml, { status: 200 }));
		vi.stubGlobal('fetch', fetchMock);

		const response = await GET();

		expect(fetchMock).toHaveBeenCalledWith('https://api.rilog.test/v1/sitemap.xml', {
			next: { revalidate: 3600 },
		});
		expect(response.status).toBe(200);
		expect(response.headers.get('Content-Type')).toBe('application/xml; charset=utf-8');
		expect(await response.text()).toBe(xml);
	});

	it('API 주소가 없으면 503을 반환한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '');

		const response = await GET();

		expect(response.status).toBe(503);
	});

	it.each([404, 500])('백엔드가 %i를 반환하면 503으로 처리한다', async (status) => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.test');
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Unavailable', { status })));

		const response = await GET();

		expect(response.status).toBe(503);
	});

	it('네트워크 오류는 503으로 처리한다', async () => {
		vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', 'https://api.rilog.test');
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Network unavailable')));

		const response = await GET();

		expect(response.status).toBe(503);
	});
});
