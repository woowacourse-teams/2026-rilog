import type { DailyHeadline } from '@/features/the-rilog-daily-headlines/model/daily-headline';

interface MagazineArticleProfile {
	type: 'bloger' | 'enterprise';
	name: string;
	profileImageUrl: string | null;
}

export interface MagazineArticle {
	id: string;
	title: string;
	summary: string;
	thumbnailRatio: '16:9' | '4:3';
	artwork: 'ai' | 'people' | 'systems' | 'code';
	profile: MagazineArticleProfile;
}

export const DAILY_HEADLINES: readonly DailyHeadline[] = [
	{ id: 'small-models', title: '작은 AI 모델, 응답 속도와 운영 비용을 함께 따져 고르는 기준' },
	{ id: 'open-source', title: '오픈소스 프로젝트의 다음 운영 방식을 만드는 유지보수 원칙' },
	{ id: 'browser', title: '브라우저는 텍스트 선택과 문장 위치를 어디까지 정확하게 기억할까' },
	{ id: 'developer-tools', title: '개발 도구의 경계가 코딩부터 테스트와 배포까지 넓어지고 있다' },
	{ id: 'platform-teams', title: '플랫폼 팀은 모든 프로젝트가 따를 기본값을 어떻게 설계할까' },
	{ id: 'data-systems', title: '데이터 시스템의 캐시와 원본 값은 어떻게 조용히 진화할까' },
	{ id: 'accessibility', title: '누구나 키보드와 화면 읽기로 사용할 수 있는 인터페이스 만들기' },
	{ id: 'release-culture', title: '배포 이후에도 장애와 사용자 반응을 계속 읽는 기록의 방식' },
];

export const MAGAZINE_ARTICLES: readonly MagazineArticle[] = [
	{
		id: 'people-behind-tools',
		title: '오픈소스 메인테이너는 어떤 이슈부터 볼까',
		summary: '재현 코드, 수정 범위, 기존 동작에 미치는 영향을 기준으로 이슈와 PR을 읽는다.',
		thumbnailRatio: '16:9',
		artwork: 'people',
		profile: {
			type: 'bloger',
			name: '리로',
			profileImageUrl: '/images/profile-placeholder.svg',
		},
	},
	{
		id: 'small-model-choice',
		title: '작은 AI 모델을 고르기 전에 비교할 세 가지',
		summary: '같은 작업을 입력해 응답 시간, 실행 비용, 결과의 정확도를 비교한다.',
		thumbnailRatio: '16:9',
		artwork: 'ai',
		profile: {
			type: 'bloger',
			name: '하루',
			profileImageUrl: '/images/profile-placeholder.svg',
		},
	},
	{
		id: 'open-source-trust',
		title: '재현 코드에서 첫 PR까지',
		summary: '실패하는 조건을 좁히고, 수정 전후의 차이를 설명하는 작은 PR을 만든다.',
		thumbnailRatio: '4:3',
		artwork: 'code',
		profile: {
			type: 'enterprise',
			name: '오픈소스 스튜디오',
			profileImageUrl: '/images/colog-placeholder.svg',
		},
	},
	{
		id: 'browser-experiments',
		title: '브라우저의 텍스트 선택은 어디까지 정확할까',
		summary: '인라인 코드와 줄바꿈이 섞인 문장을 Selection, Range, UTF-16 오프셋으로 연결한다.',
		thumbnailRatio: '4:3',
		artwork: 'systems',
		profile: {
			type: 'enterprise',
			name: 'Rilog Labs',
			profileImageUrl: '/images/colog-placeholder.svg',
		},
	},
	{
		id: 'company-platforms',
		title: '플랫폼 팀이 공통 CI를 줄이는 방법',
		summary: '변경 경로에 필요한 검사를 실행하고, 설치·빌드 비용과 테스트 시간을 따로 측정한다.',
		thumbnailRatio: '4:3',
		artwork: 'systems',
		profile: {
			type: 'enterprise',
			name: '플랫폼 스튜디오',
			profileImageUrl: '/images/colog-placeholder.svg',
		},
	},
];
