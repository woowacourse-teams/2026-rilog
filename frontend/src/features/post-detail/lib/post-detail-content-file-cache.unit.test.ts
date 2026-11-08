import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, expect, it, vi } from 'vitest';

import { POST_DETAIL_READABILITY_CONTENT } from '@/test/fixtures/post-detail';

import { readOrRenderPostDetailContent } from './post-detail-content-file-cache';

const temporaryDirectories: string[] = [];

afterEach(async () => {
	await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

it('게시글 ID별 HTML을 전용 디렉터리에 저장하고 본문이 바뀌면 다시 렌더링한다', async () => {
	const cacheDirectory = await mkdtemp(join(tmpdir(), 'rilog-post-html-'));
	temporaryDirectories.push(cacheDirectory);
	const render = vi
		.fn()
		.mockResolvedValueOnce('<p>first</p>')
		.mockResolvedValueOnce('<p>updated</p>')
		.mockResolvedValueOnce('<p>another post</p>');

	await expect(readOrRenderPostDetailContent(cacheDirectory, 42, [], render)).resolves.toBe('<p>first</p>');
	await expect(readOrRenderPostDetailContent(cacheDirectory, 42, [], render)).resolves.toBe('<p>first</p>');
	await expect(
		readOrRenderPostDetailContent(cacheDirectory, 42, POST_DETAIL_READABILITY_CONTENT, render),
	).resolves.toBe('<p>updated</p>');
	await expect(
		readOrRenderPostDetailContent(cacheDirectory, 43, POST_DETAIL_READABILITY_CONTENT, render),
	).resolves.toBe('<p>another post</p>');
	expect(render).toHaveBeenCalledTimes(3);
	expect(await readdir(cacheDirectory)).toEqual(['42.json', '43.json']);
	expect(await readFile(join(cacheDirectory, '42.json'), 'utf8')).toContain('<p>updated</p>');
});

it('손상된 캐시 파일을 다시 생성한다', async () => {
	const cacheDirectory = await mkdtemp(join(tmpdir(), 'rilog-post-html-'));
	temporaryDirectories.push(cacheDirectory);
	await writeFile(join(cacheDirectory, '42.json'), 'invalid JSON');
	const render = vi.fn().mockResolvedValue('<p>recovered</p>');

	await expect(readOrRenderPostDetailContent(cacheDirectory, 42, [], render)).resolves.toBe('<p>recovered</p>');
	expect(render).toHaveBeenCalledOnce();
});

it('캐시 디렉터리를 사용할 수 없어도 본문 HTML을 반환한다', async () => {
	const directory = await mkdtemp(join(tmpdir(), 'rilog-post-html-'));
	temporaryDirectories.push(directory);
	const cacheDirectory = join(directory, 'cache');
	await writeFile(cacheDirectory, 'directory unavailable');
	const render = vi.fn().mockResolvedValue('<p>rendered</p>');
	const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

	try {
		await expect(readOrRenderPostDetailContent(cacheDirectory, 42, [], render)).resolves.toBe('<p>rendered</p>');
		expect(render).toHaveBeenCalledOnce();
		expect(warning).toHaveBeenCalled();
	} finally {
		warning.mockRestore();
	}
});
