import { describe, expect, it } from 'vitest';

import { formatEnterpriseArticleText } from './format-enterprise-article-text';

describe('formatEnterpriseArticleText', () => {
	it.each([
		{ titleLength: 19, summaryLength: 99 },
		{ titleLength: 20, summaryLength: 100 },
	])('제목 $titleLength자와 설명 $summaryLength자는 원문을 그대로 표시한다', ({ titleLength, summaryLength }) => {
		const text = { title: '가'.repeat(titleLength), summary: 'W'.repeat(summaryLength) };
		expect(formatEnterpriseArticleText(text)).toEqual(text);
	});

	it('제목은 원문을 유지하고 설명 101자는 말줄임 기호를 포함해 100자로 표시한다', () => {
		expect(formatEnterpriseArticleText({ title: '가'.repeat(21), summary: '나'.repeat(101) })).toEqual({
			title: '가'.repeat(21),
			summary: `${'나'.repeat(99)}…`,
		});
	});

	it('공백을 문자 수에 포함하고 제한 안의 공백을 그대로 유지한다', () => {
		const text = { title: ' 가'.repeat(10), summary: ' W'.repeat(50) };
		expect(formatEnterpriseArticleText(text)).toEqual(text);
		expect(formatEnterpriseArticleText({ title: `${text.title}가`, summary: `${text.summary}W` })).toEqual({
			title: `${text.title}가`,
			summary: `${text.summary.slice(0, 99)}…`,
		});
	});

	it('이모지와 결합 문자가 최대 길이 안에 있으면 원문을 그대로 표시한다', () => {
		const text = { title: '👨‍👩‍👧‍👦'.repeat(20), summary: 'e\u0301'.repeat(100) };
		expect(formatEnterpriseArticleText(text)).toEqual(text);
	});

	it('제목 이모지는 유지하고 초과한 설명의 결합 문자는 중간에서 분리하지 않는다', () => {
		expect(formatEnterpriseArticleText({ title: '👨‍👩‍👧‍👦'.repeat(21), summary: 'e\u0301'.repeat(101) })).toEqual({
			title: '👨‍👩‍👧‍👦'.repeat(21),
			summary: `${'e\u0301'.repeat(99)}…`,
		});
	});
});
