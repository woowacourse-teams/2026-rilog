import { describe, expect, it } from 'vitest';

import { getLatestReleaseNote, RELEASE_NOTES } from './release-notes';

const older = { id: 'old', title: '이전', publishedAt: '2026-08-01', items: [] };
const newer = { id: 'new', title: '최근', publishedAt: '2026-09-01', items: [] };

describe('최신 업데이트 선택', () => {
	it('등록된 릴리즈노트에서 최신 업데이트를 반환한다', () => {
		expect(getLatestReleaseNote(RELEASE_NOTES)).toEqual({
			id: '2026-09-14-update',
			title: 'Rilog. 패치노트 v3',
			publishedAt: '2026-09-14',
			items: [
				{
					title: '📁 카테고리로 원하는 글만 모아보세요',
					description:
						'기술, 회고, 일상 카테고리가 새로 생겼어요. 피드의 노이즈는 줄이고 관심 있는 주제의 글만 명확하게 골라 읽을 수 있어요.',
				},
				{
					title: '🗂️ 챕터와 시리즈로 글을 더 깔끔하게 정리하세요',
					description:
						'카테고리로 전체 성격을 나누고, 개인 블로그는 시리즈, Colog는 챕터로 관련 글들을 묶어 나만의 흐름으로 정리할 수 있어요.',
				},
				{
					title: '🎨 피드와 상세 화면 레이아웃을 정돈했어요',
					description:
						'시각적 피로감을 줄이도록 전체 피드를 한눈에 파악하기 쉽게 개편하고, 게시글 상세 UI와 목차, 썸네일 비율을 깔끔하게 다듬었어요.',
				},
				{
					title: '🔍 사이드바와 푸터 접근성을 개선했어요',
					description:
						'자주 찾는 서비스 정보와 문의 메일을 더 쉽게 찾으실 수 있도록 사이드바에 추가하고, 푸터 UI를 정돈했어요.',
				},
			],
			links: [
				{
					label: '업데이트 자세히 보기 ↗',
					href: 'https://www.rilog.kr/@rilog/posts/83',
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
