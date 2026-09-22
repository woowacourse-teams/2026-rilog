import { describe, expect, it } from 'vitest';

import { getLatestReleaseNote } from './release-notes';

const older = { id: 'old', title: '이전', publishedAt: '2026-08-01', items: [] };
const newer = { id: 'new', title: '최근', publishedAt: '2026-09-01', items: [] };

describe('최신 업데이트 선택', () => {
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
