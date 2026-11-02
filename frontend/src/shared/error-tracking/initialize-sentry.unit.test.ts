import * as Sentry from '@sentry/nextjs';
import { afterEach, expect, it, vi } from 'vitest';

import { initializeSentry } from './initialize-sentry';

vi.mock('@sentry/nextjs', () => ({ init: vi.fn() }));

afterEach(() => {
	vi.unstubAllEnvs();
	vi.clearAllMocks();
});

it('모든 runtime은 실행 모드와 독립된 환경과 runtime 태그를 SDK에 전달한다', () => {
	vi.stubEnv('NODE_ENV', 'production');
	vi.stubEnv('NEXT_PUBLIC_SENTRY_ENVIRONMENT', 'smoke');
	vi.stubEnv('NEXT_PUBLIC_SENTRY_ENABLED', 'true');
	vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@example.invalid/1');
	for (const runtime of ['browser', 'node', 'edge'] as const) {
		initializeSentry({ runtime });
		expect(Sentry.init).toHaveBeenLastCalledWith(
			expect.objectContaining({ environment: 'smoke', enabled: true, initialScope: { tags: { runtime } } }),
		);
	}
});

it('운영 실행 모드에서도 명시적 수집 비활성화를 SDK에 전달한다', () => {
	vi.stubEnv('NODE_ENV', 'production');
	vi.stubEnv('NEXT_PUBLIC_SENTRY_ENVIRONMENT', 'prod');
	vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.rilog.kr');
	vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@example.invalid/1');
	vi.stubEnv('NEXT_PUBLIC_SENTRY_ENABLED', 'false');
	initializeSentry();
	expect(Sentry.init).toHaveBeenCalledWith(expect.objectContaining({ environment: 'prod', enabled: false }));
});

it.each(['legacy', 'webhook', 'off', undefined])(
	'상속한 Slack 모드 %s에서도 SDK는 이벤트만 수집하고 직접 Slack 전송을 하지 않는다',
	async (mode) => {
		vi.stubEnv('NEXT_PUBLIC_SENTRY_SLACK_MODE', mode);
		vi.stubEnv('SENTRY_SLACK_MODE', mode);
		vi.stubEnv('NEXT_PUBLIC_SENTRY_ENVIRONMENT', 'prod');
		vi.stubEnv('NEXT_PUBLIC_SENTRY_ENABLED', 'true');
		vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.rilog.kr');
		vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@example.invalid/1');
		const fetch = vi.fn();
		const sendBeacon = vi.fn();
		vi.stubGlobal('fetch', fetch);
		vi.stubGlobal('navigator', { sendBeacon });
		try {
			for (const runtime of ['browser', 'node', 'edge'] as const) {
				initializeSentry({ runtime });
				const options = vi.mocked(Sentry.init).mock.calls.at(-1)?.[0];
				const event = await options?.beforeSend?.(
					{ type: undefined, event_id: '11111111111111111111111111111111', environment: 'prod', message: 'test' },
					{},
				);
				expect(event).toMatchObject({ environment: 'prod' });
			}
			expect(fetch).not.toHaveBeenCalled();
			expect(sendBeacon).not.toHaveBeenCalled();
		} finally {
			vi.unstubAllGlobals();
		}
	},
);
