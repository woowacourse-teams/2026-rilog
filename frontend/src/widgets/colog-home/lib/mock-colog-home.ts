import type { CologHomeData } from '@/widgets/colog-home/model/colog-home';

export const MOCK_COLOG_HOME: CologHomeData = {
	profile: {
		name: '리로그',
		slug: 'rilog',
		introduction: 'React와 클린 아키텍처를 함께 공부합니다.',
		logoImageUrl: '',
		coverImageUrl: '',
		serviceUrl: 'https://www.rilog.kr',
		githubUrl: 'https://github.com/woowacourse-teams/2026-rilog',
		email: 'contact@rilog.dev',
	},
	posts: Array.from({ length: 5 }, (_, index) => ({
		id: index + 1,
		title:
			index === 0
				? '컴포넌트 시스템, 이렇게 도입했어요'
				: '컴포넌트 시스템, 이렇게 도입했어요 두 줄일 땐 이렇게 표시됩니다 세 줄은 표시되지 않아요',
		publishedAt: '2024-05-20',
		author: {
			nickname: '김지연',
			profileImageUrl: null,
		},
	})),
	members: [
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
		nickname,
		profileImageUrl: null,
	})),
};
