import { describe, expect, it } from 'vitest';

import { getLatestReleaseNote, RELEASE_NOTES } from './release-notes';

const older = { id: 'old', title: '이전', publishedAt: '2026-08-01', items: [] };
const newer = { id: 'new', title: '최근', publishedAt: '2026-09-01', items: [] };

describe('최신 업데이트 선택', () => {
	it('등록된 릴리즈노트에서 최신 업데이트를 반환한다', () => {
		expect(getLatestReleaseNote(RELEASE_NOTES)).toEqual({
			id: '2026-09-feed-update',
			title: 'Rilog. 패치노트 v2',
			publishedAt: '2026-09-05',
			items: [
				{
					title: '✍️ 개인 블로그에 글을 남겨보세요',
					description:
						'이제 개인 블로그에도 글을 발행할 수 있어요. 학습 기록부터 개인 프로젝트 회고까지 자유롭게 남겨보세요.',
				},
				{
					title: '📚 관련 글을 챕터와 시리즈로 모아보세요',
					description: 'Colog에서는 챕터로, 개인 블로그에서는 시리즈로 관련 글을 묶어 순서대로 정리할 수 있어요.',
				},
				{
					title: '👥 팀원 초대가 더 쉬워졌어요',
					description:
						'Colog 홈의 Members 영역에서 바로 멤버를 초대할 수 있어요. 초대한 멤버가 관리 목록에 표시되지 않던 문제도 수정했어요.',
				},
				{
					title: '🛠️ 불편했던 부분을 고쳤어요',
					description: '변경한 Colog 커버 이미지가 프로필에 반영되도록 수정하고, 로고의 균형을 다듬었어요.',
				},
			],
			links: [
				{
					label: '업데이트 자세히 보기 ↗',
					href: 'https://www.rilog.kr/@rilog/posts/42',
				},
			],
		});
	});
	it('빈 목록에는 업데이트가 없다', () => {
		expect(getLatestReleaseNote([])).toBeUndefined();
	});
	it('목록 순서와 무관하게 가장 최근 날짜 하나를 선택한다', () => {
		expect(getLatestReleaseNote([older, newer])).toBe(newer);
		expect(getLatestReleaseNote([newer, older])).toBe(newer);
	});
	it('같은 날짜는 앞 항목을 선택하고 원본을 변경하지 않는다', () => {
		const notes = Object.freeze([newer, { ...newer, id: 'same-day' }]);
		expect(getLatestReleaseNote(notes)).toBe(newer);
	});
});
