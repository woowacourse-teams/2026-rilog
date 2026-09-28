import { afterEach, describe, expect, it, vi } from 'vitest';

import { getRecentCodeLanguage, RECENT_CODE_LANGUAGE_KEY, saveRecentCodeLanguage } from './recent-code-language';

describe('recent code language', () => {
	afterEach(() => {
		window.localStorage.clear();
		vi.restoreAllMocks();
	});

	it('선택한 언어를 다음 글쓰기에서도 다시 읽는다', () => {
		expect(getRecentCodeLanguage()).toBe('text');
		saveRecentCodeLanguage('typescript');
		expect(window.localStorage.getItem(RECENT_CODE_LANGUAGE_KEY)).toBe('typescript');
		expect(getRecentCodeLanguage()).toBe('typescript');

		window.localStorage.setItem(RECENT_CODE_LANGUAGE_KEY, 'python');
		expect(getRecentCodeLanguage()).toBe('python');
	});

	it('알 수 없는 저장값과 지원하지 않는 선택은 기본 언어로 처리한다', () => {
		window.localStorage.setItem(RECENT_CODE_LANGUAGE_KEY, 'not-supported');
		expect(getRecentCodeLanguage()).toBe('text');
		saveRecentCodeLanguage('not-supported');
		expect(window.localStorage.getItem(RECENT_CODE_LANGUAGE_KEY)).toBe('not-supported');
	});

	it('저장소 접근이 막혀도 글쓰기를 계속할 수 있다', () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		expect(getRecentCodeLanguage()).toBe('text');
		expect(() => saveRecentCodeLanguage('javascript')).not.toThrow();
	});
});
