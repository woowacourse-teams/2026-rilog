import { describe, expect, it } from 'vitest';

import { normalizeLegacySlug } from './normalize-legacy-slug';

describe('normalizeLegacySlug', () => {
	it('기존 slug의 모든 하이픈을 언더스코어로 바꾼다', () => {
		expect(normalizeLegacySlug('rilog-team-blog')).toBe('rilog_team_blog');
	});

	it('하이픈이 없으면 slug를 그대로 반환한다', () => {
		expect(normalizeLegacySlug('rilog_team')).toBe('rilog_team');
	});
});
