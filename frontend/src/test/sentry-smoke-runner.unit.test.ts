import { afterEach, expect, it, vi } from 'vitest';

const { spawnSync } = vi.hoisted(() => ({
	spawnSync: vi.fn((_command: string, _args: string[], _options: { env?: NodeJS.ProcessEnv }) => ({
		status: 0,
		stdout: 'fixture-commit',
	})),
}));

vi.mock('node:child_process', () => ({ spawnSync }));
vi.mock('node:fs', () => ({ existsSync: () => true }));

afterEach(() => {
	vi.unstubAllEnvs();
	vi.restoreAllMocks();
});

it('Sentry smoke는 명시적 fixture를 먼저 생성하고 같은 입력으로 빌드한 뒤 검증한다', async () => {
	vi.stubEnv('SENTRY_AUTH_TOKEN', 'fixture-token');
	vi.stubEnv('SENTRY_SMOKE_DSN', 'https://public@localhost/1');
	vi.stubEnv('SENTRY_SMOKE_DRY_RUN', 'false');
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
		});
	}
});
