import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { PostContentBlock } from '@/domains/post/model/post-content';

// 본문 HTML 생성 규칙이 바뀌면 버전을 올려 이전 배포의 HTML을 다시 생성한다.
const CACHE_VERSION = 1;

interface CachedPostDetailContent {
	digest: string;
	html: string;
}

const isCachedPostDetailContent = (value: unknown): value is CachedPostDetailContent => {
	if (value === null || typeof value !== 'object') return false;
	return 'digest' in value && typeof value.digest === 'string' && 'html' in value && typeof value.html === 'string';
};

export async function readOrRenderPostDetailContent(
	cacheDirectory: string,
	postId: number,
	blocks: PostContentBlock[],
	render: (blocks: PostContentBlock[]) => Promise<string>,
): Promise<string> {
	const digest = createHash('sha256')
		.update(JSON.stringify([CACHE_VERSION, postId, blocks]))
		.digest('hex');
	const cachePath = join(cacheDirectory, `${postId}.json`);

	try {
		const cached: unknown = JSON.parse(await readFile(cachePath, 'utf8'));
		if (isCachedPostDetailContent(cached) && cached.digest === digest) return cached.html;
	} catch (error) {
		if (!(error instanceof SyntaxError) && !(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
			console.warn('Post detail content cache read failed', error);
		}
	}

	const html = await render(blocks);
	const temporaryPath = `${cachePath}.${randomUUID()}.tmp`;
	try {
		await mkdir(cacheDirectory, { recursive: true });
		await writeFile(temporaryPath, JSON.stringify({ digest, html }), { flag: 'wx' });
		await rename(temporaryPath, cachePath);
	} catch (error) {
		console.warn('Post detail content cache write failed', error);
	} finally {
		try {
			await rm(temporaryPath, { force: true });
		} catch (error) {
			console.warn('Post detail content cache cleanup failed', error);
		}
	}
	return html;
}
