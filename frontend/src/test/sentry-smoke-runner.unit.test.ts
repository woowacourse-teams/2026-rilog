import { beforeEach, afterEach, expect, it, vi } from 'vitest';

const { spawnSync } = vi.hoisted(() => ({
	spawnSync: vi.fn((_command: string, _args: string[], _options: { env?: NodeJS.ProcessEnv }) => ({
		status: 0,
		stdout: 'fixture-commit',
	})),
}));

vi.mock('node:child_process', () => ({ spawnSync }));
vi.mock('node:fs', () => ({ existsSync: () => true }));

beforeEach(() => {
	vi.resetModules();
	spawnSync.mockClear();
	vi.stubEnv('SENTRY_SMOKE_PROJECT_ID', '2');
	vi.stubEnv('SENTRY_SMOKE_PROJECT_SLUG', 'rilog-smoke');
	vi.stubEnv('SENTRY_SMOKE_ORG', 'test-org');
});

afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

it('Sentry smoke는 명시적 fixture를 먼저 생성하고 같은 입력으로 빌드한 뒤 검증한다', async () => {
	vi.stubEnv('SENTRY_AUTH_TOKEN', 'fixture-token');
	vi.stubEnv('SENTRY_SMOKE_DSN', 'https://public@o0.ingest.sentry.io/2');
	vi.stubEnv('SENTRY_SMOKE_DRY_RUN', 'false');
	vi.stubEnv('SENTRY_SLACK_BOT_TOKEN', 'inherited-token');
	vi.stubEnv('SENTRY_SLACK_CHANNEL_ID', 'inherited-channel');
	vi.stubEnv('SENTRY_SLACK_WEBHOOK_URL', 'https://hooks.slack.com/services/inherited');
	vi.spyOn(console, 'info').mockImplementation(() => undefined);
	vi.spyOn(process, 'exit').mockImplementation(() => {
		throw new Error('Unexpected smoke runner exit');
	});

	// Replace subprocesses so this checks orchestration without sending Sentry/Slack events.
	await import('../../test-harness/run-sentry-sourcemap-smoke.mjs');
	const commands = spawnSync.mock.calls.filter(([command]) => command !== 'git');
	expect(commands.map(([command, args]) => [command, args])).toEqual([
		[process.execPath, ['scripts/create-the-rilog-fixture.mjs']],
		['pnpm', ['prepare:the-rilog']],
		['pnpm', ['build']],
		['pnpm', ['test:sentry:post-503']],
	]);
	for (const [, , options] of commands) {
		expect(options.env).toMatchObject({
			THE_RILOG_SNAPSHOT_PATH: '.the-rilog-build/fixture.json',
			THE_RILOG_ALLOW_FIXTURE: 'true',
			NEXT_PUBLIC_SENTRY_ENVIRONMENT: 'smoke',
			SENTRY_SLACK_BOT_TOKEN: '',
			SENTRY_SLACK_CHANNEL_ID: '',
			SENTRY_SLACK_WEBHOOK_URL: '',
		});
	}
});

it('운영 프로젝트 대상은 fixture 생성과 build 전에 거부한다', async () => {
	vi.stubEnv('SENTRY_SMOKE_DSN', 'https://public@o0.ingest.sentry.io/4512133995429888');
	vi.stubEnv('SENTRY_SMOKE_PROJECT_ID', '4512133995429888');
	await expect(import('../../test-harness/run-sentry-sourcemap-smoke.mjs')).rejects.toThrow('production project');
	expect(spawnSync).not.toHaveBeenCalled();
});
