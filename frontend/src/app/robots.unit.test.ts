import { describe, expect, it } from 'vitest';

import robots from './robots';

describe('robots', () => {
	it('검색 crawler는 허용하고 학습 crawler는 차단한다', () => {
		const result = robots();
		const rules = Array.isArray(result.rules) ? result.rules : [result.rules];

		expect(rules).toContainEqual(
			expect.objectContaining({ userAgent: ['GPTBot', 'Google-Extended', 'ClaudeBot'], disallow: '/' }),
		);
		expect(rules).toContainEqual(
			expect.objectContaining({ userAgent: ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot'], allow: '/' }),
		);
		expect(result.sitemap).toBe('https://rilog.kr/sitemap.xml');
		expect(rules[0]?.disallow).toContain('/colog/create');
	});
});
