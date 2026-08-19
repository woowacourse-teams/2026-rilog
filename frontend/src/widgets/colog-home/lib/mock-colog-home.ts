import type { CologMemberSummary, CologProfile } from '@/domains/blog/model/colog';
import type { PostSummary } from '@/domains/post/model/post';

export const MOCK_COLOG_HOME_PROFILE = {
	name: '리로그',
	slug: 'rilog',
	description: 'React와 클린 아키텍처를 함께 공부합니다.',
	profileImageUrl: '',
	coverImageUrl: '',
	serviceUrl: 'https://www.rilog.kr',
	githubUrl: 'https://github.com/woowacourse-teams/2026-rilog',
} satisfies CologProfile;

export const MOCK_COLOG_HOME_POSTS = Array.from({ length: 5 }, (_, index) => ({
	id: index + 1,
	title:
		index === 0
			? '컴포넌트 시스템, 이렇게 도입했어요'
			: '컴포넌트 시스템, 이렇게 도입했어요 두 줄일 땐 이렇게 표시됩니다 세 줄은 표시되지 않아요',
	thumbnailUrl: index === 1 ? null : '/images/default-post-cover.svg',
	publishedAt: '2024-05-20',
	author: {
		id: 1,
		nickname: '김지연',
		slug: 'kim-jiyeon',
		profileImageUrl: null,
	},
})) satisfies PostSummary[];

export const MOCK_COLOG_HOME_MEMBERS = [
	'김지연',
	'박리로그',
	'이리로그',
	'최리로그',
	'정리로그',
	'한리로그',
	'윤리로그',
	'서리로그',
	'송리로그',
	'장리로그',
	'오리로그',
].map((nickname, index) => ({
	id: index + 1,
	slug: `member-${index + 1}`,
	nickname,
	profileImageUrl: null,
})) satisfies CologMemberSummary[];
