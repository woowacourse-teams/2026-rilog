import { describe, expect, it } from 'vitest';

import { isHttpUrl } from './is-http-url';

describe('isHttpUrl', () => {
	it('앞뒤 공백을 무시하고 HTTP(S) URL만 허용한다', () => {
		expect(isHttpUrl('  https://rilog.kr  ')).toBe(true);
		expect(isHttpUrl('HTTP://rilog.kr')).toBe(true);
		expect(isHttpUrl('rilog.kr')).toBe(false);
		expect(isHttpUrl('ftp://rilog.kr')).toBe(false);
	});
});
