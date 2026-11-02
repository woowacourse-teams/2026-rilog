import { afterEach, expect, it, vi } from 'vitest';

import { POST } from './route';

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

it.each(['legacy', 'webhook', 'off', '', undefined, 'invalid'])(
	'모드 %s와 무관하게 폐기된 공개 relay는 본문을 읽거나 전송하지 않고 410을 반환한다',
	(mode) => {
		vi.stubEnv('SENTRY_SLACK_MODE', mode);
		vi.stubEnv('NEXT_PUBLIC_SENTRY_SLACK_MODE', 'legacy');
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		expect(POST().status).toBe(410);
		expect(fetch).not.toHaveBeenCalled();
	},
);
