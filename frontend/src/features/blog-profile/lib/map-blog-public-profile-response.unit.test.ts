import { describe, expect, it } from 'vitest';

import type { BlogPublicProfileResponse } from '@/shared/api/blogs/types';

import { mapBlogPublicProfileResponse } from './map-blog-public-profile-response';

const COLOG_RESPONSE: BlogPublicProfileResponse = {
	type: 'COLOG',
	id: 1,
	name: '리로그 팀',
	slug: 'rilog-team',
	introduction: '안녕하세요, 리로그 팀입니다.',
	profileImageUrl: 'https://example.com/team-profile.png',
	coverImageUrl: 'https://example.com/team-cover.png',
	serviceUrl: 'https://rilog.example.com',
	githubUrl: 'https://github.com/woowacourse-teams/2026-rilog',
	memberCount: 5,
	postCount: 10,
};

describe('mapBlogPublicProfileResponse', () => {
	it('COLOG API 응답을 공통 공개 프로필 모델로 변환한다', () => {
		expect(mapBlogPublicProfileResponse(COLOG_RESPONSE)).toEqual({
			type: 'COLOG',
			id: 1,
			name: '리로그 팀',
			slug: 'rilog-team',
			description: '안녕하세요, 리로그 팀입니다.',
			profileImageUrl: 'https://example.com/team-profile.png',
			coverImageUrl: 'https://example.com/team-cover.png',
			serviceUrl: 'https://rilog.example.com',
			githubUrl: 'https://github.com/woowacourse-teams/2026-rilog',
			memberCount: 5,
			postCount: 10,
		});
	});

	it('RILOG API 응답의 빈 커버와 개인 블로그 값을 그대로 보존한다', () => {
		const response: BlogPublicProfileResponse = {
			type: 'RILOG',
			id: 2,
			name: '파라디',
			slug: 'jetproc',
			introduction: '기록하며 성장합니다.',
			profileImageUrl: 'https://example.com/user-profile.png',
			coverImageUrl: '',
			serviceUrl: null,
			githubUrl: 'https://github.com/jetproc',
			memberCount: 1,
			postCount: 7,
		};

		expect(mapBlogPublicProfileResponse(response)).toEqual({
			type: 'RILOG',
			id: 2,
			name: '파라디',
			slug: 'jetproc',
			description: '기록하며 성장합니다.',
			profileImageUrl: 'https://example.com/user-profile.png',
			coverImageUrl: '',
			serviceUrl: undefined,
			githubUrl: 'https://github.com/jetproc',
			memberCount: 1,
			postCount: 7,
		});
	});

	it('nullable 선택 필드를 기존 도메인 규칙에 맞게 변환한다', () => {
		const response: BlogPublicProfileResponse = {
			...COLOG_RESPONSE,
			introduction: null,
			profileImageUrl: null,
			coverImageUrl: null,
			serviceUrl: null,
			githubUrl: null,
		};

		expect(mapBlogPublicProfileResponse(response)).toEqual({
			type: 'COLOG',
			id: 1,
			name: '리로그 팀',
			slug: 'rilog-team',
			description: undefined,
			profileImageUrl: null,
			coverImageUrl: null,
			serviceUrl: undefined,
			githubUrl: undefined,
			memberCount: 5,
			postCount: 10,
		});
	});
});
