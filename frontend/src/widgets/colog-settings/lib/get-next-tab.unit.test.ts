import { describe, expect, it } from 'vitest';

import { getNextTab } from './get-next-tab';

describe('getNextTab', () => {
	it('오른쪽과 왼쪽 방향키로 순환한다', () => {
		expect(getNextTab('danger', 'ArrowRight')).toBe('profile');
		expect(getNextTab('profile', 'ArrowLeft')).toBe('danger');
	});

	it('Home과 End로 처음과 마지막 탭을 선택한다', () => {
		expect(getNextTab('members', 'Home')).toBe('profile');
		expect(getNextTab('members', 'End')).toBe('danger');
	});

	it('탭 이동 키가 아니면 이동하지 않는다', () => {
		expect(getNextTab('members', 'Enter')).toBeNull();
	});
});
