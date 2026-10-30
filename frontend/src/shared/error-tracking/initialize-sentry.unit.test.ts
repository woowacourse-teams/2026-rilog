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

it('production 빌드의 smoke 이벤트는 운영 Slack callback을 실행하지 않는다', async () => {
	vi.stubEnv('NODE_ENV', 'production');
	vi.stubEnv('NEXT_PUBLIC_SENTRY_ENVIRONMENT', 'smoke');
	vi.stubEnv('NEXT_PUBLIC_SENTRY_ENABLED', 'true');
	vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@example.invalid/1');
	const onSlackAlert = vi.fn();
	initializeSentry({ onSlackAlert });
	const options = vi.mocked(Sentry.init).mock.calls.at(-1)?.[0];
	await options?.beforeSend?.(
		{ type: undefined, event_id: '11111111111111111111111111111111', environment: 'prod', message: 'test' },
		{},
	);
	expect(onSlackAlert).not.toHaveBeenCalled();
});

it.each(['webhook', 'off'])('모드 %s는 SDK 이벤트는 유지하고 직접 Slack callback만 끈다', async (mode) => {
	vi.stubEnv('NEXT_PUBLIC_SENTRY_SLACK_MODE', mode);
	vi.stubEnv('NEXT_PUBLIC_SENTRY_ENVIRONMENT', 'prod');
	vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://www.rilog.kr');
	vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://public@example.invalid/1');
	const onSlackAlert = vi.fn();
	initializeSentry({ onSlackAlert });
	const options = vi.mocked(Sentry.init).mock.calls.at(-1)?.[0];
	const event = await options?.beforeSend?.(
		{ type: undefined, event_id: '11111111111111111111111111111111', environment: 'prod', message: 'test' },
		{},
	);
	expect(event).toMatchObject({ environment: 'prod' });
	expect(onSlackAlert).not.toHaveBeenCalled();
});
