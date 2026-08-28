import { describe, expect, it } from 'vitest';

import {
	APP_ROUTES,
	buildBlogHomePath,
	buildCologSettingsPath,
	buildDraftWritePath,
	buildRilogSettingsPath,
	buildPostDetailPath,
	hasBlogSlugPrefix,
	parseCologSettingsTab,
	parseRilogSettingsTab,
} from './app-routes';

describe('app routes', () => {
	it('정적 페이지 경로를 제공한다', () => {
		expect(APP_ROUTES).toEqual({
			feeds: '/feeds',
			cologCreate: '/co-logs/create',
			signUp: '/sign-up',
			write: '/write',
		});
	});

	it('코로그 경로의 @ 접두사를 판별한다', () => {
		expect(hasBlogSlugPrefix('@rilog')).toBe(true);
		expect(hasBlogSlugPrefix('%40rilog')).toBe(true);
		expect(hasBlogSlugPrefix('rilog')).toBe(false);
	});

	it('블로그 slug를 @ 경로 segment로 정규화한다', () => {
		expect(buildBlogHomePath(' @rilog ')).toBe('/@rilog');
		expect(buildBlogHomePath('%40rilog')).toBe('/@rilog');
		expect(buildBlogHomePath('team/name')).toBe('/@team%2Fname');
	});

	it('코로그 설정 탭 경로를 만든다', () => {
		expect(buildCologSettingsPath('rilog', 'profile')).toBe('/@rilog/settings?tab=profile');
		expect(buildCologSettingsPath('rilog', 'members')).toBe('/@rilog/settings?tab=members');
		expect(buildCologSettingsPath('rilog', 'danger')).toBe('/@rilog/settings?tab=danger');
	});

	it('지원하지 않는 설정 탭은 프로필 탭으로 해석한다', () => {
		expect(parseCologSettingsTab('mebers')).toBe('profile');
		expect(parseCologSettingsTab(undefined)).toBe('profile');
	});

	it('개인 설정 탭 경로를 만들고 지원하지 않는 값은 프로필로 해석한다', () => {
		expect(buildRilogSettingsPath('rilog', 'profile')).toBe('/@rilog/settings?tab=profile');
		expect(buildRilogSettingsPath('rilog', 'danger')).toBe('/@rilog/settings?tab=danger');
		expect(parseRilogSettingsTab('members')).toBe('profile');
		expect(parseRilogSettingsTab(['danger', 'profile'])).toBe('danger');
	});

	it('코로그 slug와 게시글 ID로 상세 경로를 만든다', () => {
		expect(buildPostDetailPath('rilog', 'post/40')).toBe('/@rilog/posts/post%2F40');
	});

	it('draftId로 임시저장 작성 경로를 만든다', () => {
		expect(buildDraftWritePath(42)).toBe('/write?draftId=42');
	});

	it('동적 경로에 빈 값은 허용하지 않는다', () => {
		expect(() => buildBlogHomePath(' @ ')).toThrow('블로그 slug가 필요합니다.');
		expect(() => buildPostDetailPath('rilog', '   ')).toThrow('게시글 ID가 필요합니다.');
	});
});
