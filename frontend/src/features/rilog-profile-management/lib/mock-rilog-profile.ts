import type { RilogProfileSettingsValue } from '../model/rilog-profile-settings';

import { stripAtPrefix } from '@/shared/utils/strip-at-prefix';

export const createMockRilogProfile = (slug: string): RilogProfileSettingsValue => ({
	nickname: '리로거',
	slug: stripAtPrefix(slug),
	description: '기록하고 성장하는 개발자입니다.',
	profileImageUrl: '',
	serviceUrl: 'https://rilog.kr',
	githubUrl: 'https://github.com/rilog',
	profileImageFile: null,
});
