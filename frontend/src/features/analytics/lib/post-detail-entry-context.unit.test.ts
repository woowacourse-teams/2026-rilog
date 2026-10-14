// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';

import { consumePostDetailEntryContext, recordPostDetailEntryContext } from './post-detail-entry-context';

const theRilog = {
	theRilogVisitId: 'magazine-visit',
	theRilogClickId: 'click-one',
	contentType: 'headline' as const,
	position: 2,
	headlineId: '12:block-one',
};

afterEach(() => {
	sessionStorage.clear();
	vi.restoreAllMocks();
});

describe('게시글 상세 유입 정보', () => {
	it('같은 게시글에 도착하면 더 리로그 클릭 정보를 한 번만 소비한다', () => {
		recordPostDetailEntryContext({ postId: 12, entrySource: 'the_rilog', feedPosition: null, theRilog });
		expect(consumePostDetailEntryContext(12)).toEqual({ entrySource: 'the_rilog', feedPosition: null, theRilog });
		expect(consumePostDetailEntryContext(12)).toBeNull();
	});

	it('다른 게시글에 도착하면 유입 정보를 폐기한다', () => {
		recordPostDetailEntryContext({ postId: 12, entrySource: 'the_rilog', feedPosition: null, theRilog });
		expect(consumePostDetailEntryContext(13)).toBeNull();
		expect(consumePostDetailEntryContext(12)).toBeNull();
	});

	it.each([
		undefined,
		{ ...theRilog, position: 0 },
		{ ...theRilog, theRilogClickId: '' },
		{ ...theRilog, headlineId: 12 },
	])('손상된 더 리로그 정보를 정상 유입으로 사용하지 않는다', (value) => {
		sessionStorage.setItem(
			'rilog.post-detail-entry-context',
			JSON.stringify({ postId: 12, entrySource: 'the_rilog', feedPosition: null, theRilog: value }),
		);
		expect(consumePostDetailEntryContext(12)).toBeNull();
	});

	it('기존 피드 정보는 더 리로그 속성을 붙이지 않고 전달한다', () => {
		recordPostDetailEntryContext({ postId: 12, entrySource: 'feed', feedPosition: 3 });
		expect(consumePostDetailEntryContext(12)).toEqual({ entrySource: 'feed', feedPosition: 3 });
	});

	it('저장소 사용이 차단돼도 유입 기록이 페이지 이동을 중단하지 않는다', () => {
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		expect(() =>
			recordPostDetailEntryContext({ postId: 12, entrySource: 'the_rilog', feedPosition: null, theRilog }),
		).not.toThrow();
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('blocked');
		});
		expect(consumePostDetailEntryContext(12)).toBeNull();
	});
});
