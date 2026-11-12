import { filterSuggestionItems } from '@blocknote/core/extensions';
import { ko } from '@blocknote/core/locales';
import { describe, expect, it } from 'vitest';

import { slashMenuDictionary } from './slash-menu-dictionary';

describe('슬래시 메뉴 검색', () => {
	it('합의한 표시 이름으로 메뉴를 제공한다', () => {
		expect(slashMenuDictionary.check_list.title).toBe('할일목록');
		expect(slashMenuDictionary.toggle_list.title).toBe('토글 목록');
		expect(slashMenuDictionary.table.title).toBe('표');
	});
	const entries = Object.entries(slashMenuDictionary).map(([key, item]) => ({ ...item, key }));

	it('리스트 검색은 list 검색과 같은 목록 항목들을 반환한다', () => {
		const keys = (query: string) => filterSuggestionItems(entries, query).map((item) => item.key);
		expect(keys('list')).toEqual(['numbered_list', 'bullet_list', 'check_list', 'toggle_list']);
		expect(keys('리스트')).toEqual(keys('list'));
	});

	it.each([
		['check_list', '체크리스트', '할일목록', 'checklists'],
		['toggle_list', '접을 수 있는 목록', '토글 목록', 'togglelists'],
		['bullet_list', '글머리 기호 목록', '글머리기호목록', 'bulletlists'],
		['numbered_list', '번호 매기기 목록', '번호매기기목록', 'numberlists'],
		['table', '표', 'table', 'TABLE'],
	])('%s 항목은 기존 검색어와 추가 검색어로 찾을 수 있다', (key, ...queries) => {
		for (const query of queries) {
			expect(filterSuggestionItems(entries, query).map((item) => item.key)).toContain(key);
		}
	});

	it('기존 별칭과 빈 검색을 유지하고 일치하지 않는 검색은 결과가 없다', () => {
		for (const [key, item] of Object.entries(ko.slash_menu)) {
			for (const alias of item.aliases) {
				expect(filterSuggestionItems(entries, alias).map((entry) => entry.key)).toContain(key);
			}
		}
		expect(filterSuggestionItems(entries, '')).toHaveLength(entries.length);
		expect(filterSuggestionItems(entries, '검색결과없음xyz')).toHaveLength(0);
	});
});
