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
	thumbnailRatio: '16:9' | '16:10' | '4:3';
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
		summary:
			'좋은 이슈는 문제를 재현하는 방법부터 알려준다. 오픈소스 메인테이너가 재현 코드와 수정 범위, 기존 동작에 미치는 영향을 살펴보며 어떤 제안을 먼저 검토하는지 알아본다.',
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
		summary:
			'작은 AI 모델이 늘어날수록 이름이나 크기만으로 선택하기 어렵다. 같은 작업을 맡겨 응답 시간과 실행 비용, 결과의 정확도를 비교하고 서비스에 맞는 모델을 고르는 기준을 정리한다.',
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
		summary:
			'첫 PR은 큰 기능보다 재현 가능한 문제에서 시작하는 편이 좋다. 실패 조건을 좁혀 테스트로 확인하고, 기존 동작을 지키면서 수정 전후의 차이를 설명하는 과정을 따라가 본다.',
		thumbnailRatio: '16:10',
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
		summary:
			'선택한 문장은 글이 바뀐 뒤에도 같은 자리를 가리킬까? 인라인 코드와 줄바꿈이 섞인 문장을 Selection, Range, UTF-16 오프셋으로 연결하는 과정을 살펴본다.',
		thumbnailRatio: '16:10',
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
		summary:
			'모든 변경에 같은 검사를 반복하면 배포가 느려진다. 플랫폼 팀이 변경 경로에 필요한 CI만 실행하고 설치와 빌드 비용, 테스트 시간을 따로 측정하며 기준을 다듬는 방법을 소개한다.',
		thumbnailRatio: '16:10',
		artwork: 'systems',
		profile: {
			type: 'enterprise',
			name: '플랫폼 스튜디오',
			profileImageUrl: '/images/colog-placeholder.svg',
		},
	},
];
