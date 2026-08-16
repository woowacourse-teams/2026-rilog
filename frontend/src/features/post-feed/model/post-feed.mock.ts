import type { PostFeedItem, PostFeedPage } from '@/domains/post/model/post-feed';

// TODO(API 연동): 실제 피드 fetcher로 교체한 뒤 런타임 mock과 시나리오를 제거
export type MockPostFeedScenario = 'success' | 'empty' | 'error';

export const POST_FEED_PAGE_SIZE = 12;

const MOCK_API_DELAY_MS = 250;

// UI 상태를 바꿔 확인할 때 이 값만 'success' | 'empty' | 'error' 중 하나로 변경
export const ACTIVE_MOCK_POST_FEED_SCENARIO: MockPostFeedScenario = 'success';

export const MOCK_POST_FEED_ITEMS: PostFeedItem[] = [
	{
		id: 1,
		title: 'React 19에서 달라진 렌더링 흐름 이해하기',
		thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-14T09:00:00',
		author: { nickname: '리로', profileImageUrl: null },
		colog: null,
	},
	{
		id: 2,
		title: '기록의 힘',
		thumbnailUrl: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-14T09:00:00',
		author: { nickname: '포케', profileImageUrl: null },
		colog: null,
	},
	{
		id: 3,
		title: '좋은 테스트가 리팩터링을 돕는 순간',
		thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-14T09:00:00',
		author: { nickname: '제트', profileImageUrl: null },
		colog: null,
	},
	{
		id: 4,
		title: '매일 기록하며 발견한 성장의 패턴',
		thumbnailUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-13T09:00:00',
		author: { nickname: '에디', profileImageUrl: null },
		colog: null,
	},
	{
		id: 5,
		title: '프론트엔드 성능을 측정하기 전에 알아둘 것',
		thumbnailUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-13T09:00:00',
		author: { nickname: '모아', profileImageUrl: null },
		colog: { name: '배달의 민족', logoUrl: null },
	},
	{
		id: 6,
		title: '우리 팀 코드 리뷰 문화를 만든 과정',
		thumbnailUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-13T09:00:00',
		author: { nickname: '해나', profileImageUrl: null },
		colog: null,
	},
	{
		id: 7,
		title: 'TypeScript 타입을 도메인 언어로 쓰기',
		thumbnailUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-12T09:00:00',
		author: { nickname: '리로', profileImageUrl: null },
		colog: null,
	},
	{
		id: 8,
		title: '사용자에게 자연스러운 빈 상태 설계하기',
		thumbnailUrl: null,
		publishedAt: '2026-08-12T09:00:00',
		author: { nickname: '포케', profileImageUrl: null },
		colog: null,
	},
	{
		id: 9,
		title: '서버 컴포넌트와 클라이언트 경계 정하기',
		thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-12T09:00:00',
		author: { nickname: '제트', profileImageUrl: null },
		colog: null,
	},
	{
		id: 10,
		title: '협업 중 충돌을 줄이는 작은 개발 습관',
		thumbnailUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-11T09:00:00',
		author: { nickname: '에디', profileImageUrl: null },
		colog: { name: '우아한테크코스', logoUrl: null },
	},
	{
		id: 11,
		title: '접근성을 나중으로 미루지 않는 UI 구현',
		thumbnailUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-11T09:00:00',
		author: { nickname: '모아', profileImageUrl: null },
		colog: null,
	},
	{
		id: 12,
		title: '한 주를 돌아보며 다음 실험을 정하는 법',
		thumbnailUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-11T09:00:00',
		author: { nickname: '해나', profileImageUrl: null },
		colog: null,
	},
	{
		id: 13,
		title: 'React 19에서 달라진 렌더링 흐름 이해하기 2편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-10T09:00:00',
		author: { nickname: '리로', profileImageUrl: null },
		colog: null,
	},
	{
		id: 14,
		title: '기록의 힘 2편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-10T09:00:00',
		author: { nickname: '포케', profileImageUrl: null },
		colog: null,
	},
	{
		id: 15,
		title: '좋은 테스트가 리팩터링을 돕는 순간 2편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-10T09:00:00',
		author: { nickname: '제트', profileImageUrl: null },
		colog: { name: '연어', logoUrl: null },
	},
	{
		id: 16,
		title: '매일 기록하며 발견한 성장의 패턴 2편',
		thumbnailUrl: null,
		publishedAt: '2026-08-09T09:00:00',
		author: { nickname: '에디', profileImageUrl: null },
		colog: null,
	},
	{
		id: 17,
		title: '프론트엔드 성능을 측정하기 전에 알아둘 것 2편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-09T09:00:00',
		author: { nickname: '모아', profileImageUrl: null },
		colog: null,
	},
	{
		id: 18,
		title: '우리 팀 코드 리뷰 문화를 만든 과정 2편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-09T09:00:00',
		author: { nickname: '해나', profileImageUrl: null },
		colog: null,
	},
	{
		id: 19,
		title: 'TypeScript 타입을 도메인 언어로 쓰기 2편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-08T09:00:00',
		author: { nickname: '리로', profileImageUrl: null },
		colog: null,
	},
	{
		id: 20,
		title: '사용자에게 자연스러운 빈 상태 설계하기 2편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-08T09:00:00',
		author: { nickname: '포케', profileImageUrl: null },
		colog: { name: '배달의 민족', logoUrl: null },
	},
	{
		id: 21,
		title: '서버 컴포넌트와 클라이언트 경계 정하기 2편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-08T09:00:00',
		author: { nickname: '제트', profileImageUrl: null },
		colog: null,
	},
	{
		id: 22,
		title: '협업 중 충돌을 줄이는 작은 개발 습관 2편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-07T09:00:00',
		author: { nickname: '에디', profileImageUrl: null },
		colog: null,
	},
	{
		id: 23,
		title: '접근성을 나중으로 미루지 않는 UI 구현 2편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-07T09:00:00',
		author: { nickname: '모아', profileImageUrl: null },
		colog: null,
	},
	{
		id: 24,
		title: '한 주를 돌아보며 다음 실험을 정하는 법 2편',
		thumbnailUrl: null,
		publishedAt: '2026-08-07T09:00:00',
		author: { nickname: '해나', profileImageUrl: null },
		colog: null,
	},
	{
		id: 25,
		title: 'React 19에서 달라진 렌더링 흐름 이해하기 3편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-06T09:00:00',
		author: { nickname: '리로', profileImageUrl: null },
		colog: { name: '우아한테크코스', logoUrl: null },
	},
	{
		id: 26,
		title: '기록의 힘 3편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1558655146-9f40138edfeb?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-06T09:00:00',
		author: { nickname: '포케', profileImageUrl: null },
		colog: null,
	},
	{
		id: 27,
		title: '좋은 테스트가 리팩터링을 돕는 순간 3편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-06T09:00:00',
		author: { nickname: '제트', profileImageUrl: null },
		colog: null,
	},
	{
		id: 28,
		title: '매일 기록하며 발견한 성장의 패턴 3편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-05T09:00:00',
		author: { nickname: '에디', profileImageUrl: null },
		colog: null,
	},
	{
		id: 29,
		title: '프론트엔드 성능을 측정하기 전에 알아둘 것 3편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-05T09:00:00',
		author: { nickname: '모아', profileImageUrl: null },
		colog: null,
	},
	{
		id: 30,
		title: '우리 팀 코드 리뷰 문화를 만든 과정 3편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-05T09:00:00',
		author: { nickname: '해나', profileImageUrl: null },
		colog: { name: '연어', logoUrl: null },
	},
	{
		id: 31,
		title: 'TypeScript 타입을 도메인 언어로 쓰기 3편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-04T09:00:00',
		author: { nickname: '리로', profileImageUrl: null },
		colog: null,
	},
	{
		id: 32,
		title: '사용자에게 자연스러운 빈 상태 설계하기 3편',
		thumbnailUrl: null,
		publishedAt: '2026-08-04T09:00:00',
		author: { nickname: '포케', profileImageUrl: null },
		colog: null,
	},
	{
		id: 33,
		title: '서버 컴포넌트와 클라이언트 경계 정하기 3편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-04T09:00:00',
		author: { nickname: '제트', profileImageUrl: null },
		colog: null,
	},
	{
		id: 34,
		title: '협업 중 충돌을 줄이는 작은 개발 습관 3편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-03T09:00:00',
		author: { nickname: '에디', profileImageUrl: null },
		colog: null,
	},
	{
		id: 35,
		title: '접근성을 나중으로 미루지 않는 UI 구현 3편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-03T09:00:00',
		author: { nickname: '모아', profileImageUrl: null },
		colog: { name: '배달의 민족', logoUrl: null },
	},
	{
		id: 36,
		title: '한 주를 돌아보며 다음 실험을 정하는 법 3편',
		thumbnailUrl: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80',
		publishedAt: '2026-08-03T09:00:00',
		author: { nickname: '해나', profileImageUrl: null },
		colog: null,
	},
];

export const createMockPostFeedPage = (
	page: number,
	scenario: MockPostFeedScenario = ACTIVE_MOCK_POST_FEED_SCENARIO,
): PostFeedPage => {
	if (scenario === 'error') {
		throw new Error('피드 mock 요청에 실패했습니다.');
	}

	if (scenario === 'empty') {
		return { items: [], page, hasNext: false };
	}

	const startIndex = page * POST_FEED_PAGE_SIZE;
	const items = MOCK_POST_FEED_ITEMS.slice(startIndex, startIndex + POST_FEED_PAGE_SIZE);

	return {
		items,
		page,
		hasNext: startIndex + POST_FEED_PAGE_SIZE < MOCK_POST_FEED_ITEMS.length,
	};
};

export const fetchMockPostFeedPage = async (page: number): Promise<PostFeedPage> => {
	await new Promise((resolve) => setTimeout(resolve, MOCK_API_DELAY_MS));

	return createMockPostFeedPage(page);
};
