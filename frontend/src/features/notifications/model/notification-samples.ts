import type { Notification } from '@/domains/notification/model/notification';

/** API 연결 전 UI 확인용. 실제 사용자 알림이나 API 응답 fixture가 아니다. */
export const NOTIFICATION_SAMPLES: readonly Notification[] = [
	{
		id: 5,
		type: 'SELECTION_COMMENT',
		createdAt: '2026-09-28T02:10:34.780901',
		isRead: false,
		author: {
			id: 13,
			slug: 'gustn99',
			nickname: '개발자',
			profileImageUrl: 'rilog/images/originals/13-8dd1e2ec-046b-4a28-93d5-055464797efa.png',
		},
		post: { id: 81, slug: 'rilog_fe2', title: '로그인 모달을 넘어 로그인 진입점을 설계하기' },
		anchor: {
			id: 1,
			content:
				'민을 했습니다. 로그인 모달을 전역으로 옮기는 것에서 시작했지만, 구현을 이어갈수록 단순히 모달의 위치만 바꿔서는 해결',
		},
		comment: { id: 1, content: 'ㅎㅇㅎㅇ' },
	},
	{
		id: 4,
		type: 'SELECTION_COMMENT',
		createdAt: '2026-09-28T02:10:34.780901',
		isRead: false,
		author: {
			id: 13,
			slug: 'gustn99',
			nickname: '개발자',
			profileImageUrl: 'rilog/images/originals/13-8dd1e2ec-046b-4a28-93d5-055464797efa.png',
		},
		post: { id: 81, slug: 'rilog_fe2', title: '로그인 모달을 넘어 로그인 진입점을 설계하기' },
		anchor: {
			id: 27,
			content:
				'이 글에서는 로그인 모달의 렌더링 위치를 하나로 모으고, 다시 로그인 필요 액션의 진입점을 좁혀간 과정을 소개합니다. 토큰 재발급의 세부 구현보다는 각 모듈이 어떤 책임을 가져야 자연스럽게 연결되는지에 집중해 볼게요.',
		},
		comment: { id: 47, content: 'ㅁㄴㅇㄹ' },
	},
	{
		id: 1,
		type: 'POST_COMMENT',
		createdAt: '2026-10-08T08:21:00Z',
		isRead: false,
		author: { id: 11, slug: 'gaeul', nickname: '닉네임은 최대 20글자까지 가능합니다', profileImageUrl: null },
		post: { id: 101, slug: 'rilog-team', title: '함께 만드는 기록, Rilog 개발 이야기' },
		anchor: { id: 201, content: '좋은 기록은 혼자 완성하는 것이 아니라, 함께 나누면서 자란다.' },
		comment: { id: 301, content: '이 문장이 특히 와닿네요. 서로의 생각을 나누면서 기록이 더 깊어지는 것 같아요!' },
	},
	{
		id: 2,
		type: 'SELECTION_COMMENT',
		createdAt: '2026-10-08T05:40:00Z',
		isRead: false,
		author: { id: 12, slug: 'bada', nickname: '바다', profileImageUrl: null },
		post: { id: 102, slug: 'dev-log', title: '컴포넌트의 책임을 나누는 기준' },
		anchor: {
			id: 202,
			content:
				'공통화의 기준은 모양이 아니라, 함께 바뀌어야 하는 이유에 있다. 공통화의 기준은 모양이 아니라, 함께 바뀌어야 하는 이유에 있다.',
		},
		comment: {
			id: 302,
			content:
				'비슷하게 생겼다는 이유만으로 분리했던 코드를 돌아보게 되네요. 좋은 글 정말정말정말정말정말정말정말정말 감사합니다.',
		},
	},
	{
		id: 3,
		type: 'POST_COMMENT',
		createdAt: '2026-10-07T11:15:00Z',
		isRead: true,
		author: { id: 13, slug: 'yeon', nickname: '연', profileImageUrl: null },
		post: { id: 103, slug: 'dev-log', title: '작은 개선을 쌓아가는 한 주의 회고' },
		anchor: { id: 203, content: '작은 시도라도 기록해 두면 다음 선택의 근거가 된다.' },
		comment: { id: 303, content: '저도 이번 주부터 짧게라도 회고를 남겨보려고요. 다음 기록도 기다릴게요.' },
	},
];
