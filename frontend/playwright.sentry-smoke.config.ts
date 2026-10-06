import { defineConfig, devices } from '@playwright/test';

const sentryDsn = process.env.SENTRY_SMOKE_DSN;

if (!sentryDsn) {
	throw new Error('SENTRY_SMOKE_DSN에 테스트용 Sentry DSN을 설정해 주세요.');
}

let parsedDsn: URL;
try {
	parsedDsn = new URL(sentryDsn);
} catch {
	throw new Error('SENTRY_SMOKE_DSN에 Sentry에서 복사한 실제 DSN을 입력해 주세요.');
}

if (
	parsedDsn.protocol !== 'https:' ||
	!parsedDsn.username ||
	!parsedDsn.hostname ||
	!/^\/\d+\/?$/.test(parsedDsn.pathname)
) {
	throw new Error('SENTRY_SMOKE_DSN 형식이 올바르지 않습니다. 테스트 프로젝트의 DSN을 확인해 주세요.');
}

export default defineConfig({
	testDir: './src/test/sentry-e2e',
	testMatch: /sentry-(feed|post)-503\.spec\.ts/,
	fullyParallel: false,
	workers: 1,
	retries: 0,
	timeout: 90_000,
	use: {
		baseURL: 'http://127.0.0.1:3109',
		bypassCSP: process.env.SENTRY_SMOKE_BYPASS_CSP === 'true',
		screenshot: 'only-on-failure',
		trace: 'retain-on-failure',
	},
	projects: [{ name: 'chromium', use: devices['Desktop Chrome'] }],
	webServer: {
		command: 'pnpm dev --hostname 127.0.0.1 --port 3109',
		url: 'http://127.0.0.1:3109/about',
		reuseExistingServer: false,
		timeout: 120_000,
		env: {
			SENTRY_FEED_503_SMOKE: 'true',
			NEXT_PUBLIC_API_BASE_URL: 'https://api.rilog.test',
			NEXT_PUBLIC_DEV_MASTER_TOKEN: '',
			NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: '',
			NEXT_PUBLIC_SENTRY_DSN: sentryDsn,
			NEXT_PUBLIC_SENTRY_ENABLED: 'true',
			SENTRY_AUTH_TOKEN: '',
		},
	},
});
