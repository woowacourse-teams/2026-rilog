import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTheRilogFixtureSnapshot } from '@/test/fixtures/the-rilog';

const frontendRoot = process.cwd();
let testDirectory: string;
let savedInput: string;

const runScript = (script: string, inputPath: string, allowFixture = true) =>
	spawnSync(
		process.execPath,
		[resolve(frontendRoot, 'scripts', script), ...(script === 'prepare-the-rilog.mjs' ? ['--output', savedInput] : [])],
		{
			cwd: frontendRoot,
			encoding: 'utf8',
			env: {
				...process.env,
				THE_RILOG_SNAPSHOT_PATH: inputPath,
				THE_RILOG_ALLOW_FIXTURE: String(allowFixture),
				NEXT_PUBLIC_SENTRY_DSN: '',
				NEXT_PUBLIC_SENTRY_ENABLED: 'false',
			},
		},
	);

beforeAll(async () => {
	testDirectory = await mkdtemp(join(tmpdir(), 'rilog-build-input-'));
	savedInput = join(testDirectory, 'output', 'snapshot.json');
});

afterAll(async () => {
	await rm(testDirectory, { recursive: true, force: true });
});

describe('SSG 입력 준비 실행 경계', () => {
	it('검증한 입력을 저장하고 손상된 다음 입력은 이전 파일을 덮어쓰지 않는다', async () => {
		const validPath = join(testDirectory, 'valid.json');
		await writeFile(validPath, JSON.stringify(createTheRilogFixtureSnapshot()));
		expect(runScript('prepare-the-rilog.mjs', validPath).status).toBe(0);
		const validOutput = await readFile(savedInput, 'utf8');
		const brokenPath = join(testDirectory, 'broken.json');
		await writeFile(brokenPath, JSON.stringify({ ...createTheRilogFixtureSnapshot(), checksum: 'broken' }));
		const failure = runScript('prepare-the-rilog.mjs', brokenPath);
		expect(failure.status).toBe(1);
		expect(failure.stderr).toContain('checksum');
		expect(await readFile(savedInput, 'utf8')).toBe(validOutput);
	});

	it('테스트 입력은 명시적인 허용 없이 production 빌드 입력으로 채택하지 않는다', async () => {
		const inputPath = join(testDirectory, 'fixture.json');
		await writeFile(inputPath, JSON.stringify(createTheRilogFixtureSnapshot()));
		const result = runScript('prepare-the-rilog.mjs', inputPath, false);
		expect(result.status).toBe(1);
		expect(result.stderr).toContain('THE_RILOG_ALLOW_FIXTURE');
	});

	it('명시한 입력 파일이 없으면 남아 있는 입력으로 Next 빌드를 시작하지 않는다', () => {
		const result = runScript('build-the-rilog.mjs', join(testDirectory, 'missing.json'));
		expect(result.status).toBe(1);
		expect(result.stderr).toContain('ENOENT');
		expect(result.stdout).not.toContain('Next.js');
	});
});
