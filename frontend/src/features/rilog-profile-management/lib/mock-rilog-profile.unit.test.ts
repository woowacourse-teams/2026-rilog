import { describe, expect, it } from 'vitest';

import { createMockRilogProfile } from './mock-rilog-profile';

describe('createMockRilogProfile', () => {
	it('경로 slug와 개인 프로필 기본값으로 목 프로필을 만든다', () => {
		expect(createMockRilogProfile('@rilogger')).toEqual({
			nickname: '리로거',
			slug: 'rilogger',
			description: '기록하고 성장하는 개발자입니다.',
			profileImageUrl: '',
			serviceUrl: 'https://rilog.kr',
			githubUrl: 'https://github.com/rilog',
			profileImageFile: null,
		});
	});
});
