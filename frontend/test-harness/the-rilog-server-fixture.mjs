// Test process only: browser route interception cannot replace Next server fetches.
// This preload never ships in the application or production artifact.
import '../scripts/register-typescript.mjs';

import { appendFile, readFile } from 'node:fs/promises';

const { createTheRilogFixtureData, createTheRilogFixtureNewsContent } =
	await import('../src/test/fixtures/the-rilog.ts');
const data = createTheRilogFixtureData();
const originalFetch = globalThis.fetch;
const envelope = (value) => Response.json({ status: 200, message: 'OK', data: value });

function paragraph(id, text) {
	return {
		id,
		type: 'paragraph',
		props: { backgroundColor: 'default', textColor: 'default', textAlignment: 'left' },
		content: [{ type: 'text', text, styles: {} }],
		children: [],
	};
}

function postDetail(postId) {
	const article = data.spotlights.find((candidate) => candidate.postId === postId);
	if (postId !== data.news.postId && !article) return null;
	const headings = createTheRilogFixtureNewsContent();
	return {
		title: article?.title ?? data.news.title,
		content: article
			? [paragraph(`article-${postId}`, '실제 게시글 상세 경로에서 표시하는 테스트 본문입니다.')]
			: [
					headings[0],
					...Array.from({ length: 12 }, (_, index) =>
						paragraph(`news-paragraph-${index}`, '헤드라인의 본문 위치를 확인하는 내용입니다. '.repeat(5)),
					),
					headings[1],
					paragraph('news-last', '두 번째 헤드라인의 본문입니다.'),
				],
		publishedAt: article?.publishedAt ?? data.news.publishedAt,
		thumbnailImageUrl: null,
		category: '기술',
		chapter: null,
		author: { userId: 1, nickname: 'Rilog 편집부', slug: data.blogSlug, profileImageUrl: null },
		owner: { type: 'RILOG', blogId: 1, slug: data.blogSlug, name: 'The Rilog.', profileImageUrl: null },
		viewerPermissions: { canEdit: false, canDelete: false },
		viewCount: 0,
		postType: article
			? article.articleType === 'enterprise'
				? 'ENTERPRISE_SPOTLIGHT'
				: 'PERSONAL_SPOTLIGHT'
			: 'DAILY_HEADLINES',
		description: article?.description ?? '오늘의 기술 소식을 모았습니다.',
		source: article?.source ?? null,
	};
}

globalThis.fetch = async (input, init) => {
	const url = new URL(input instanceof Request ? input.url : String(input));
	if (url.origin !== 'https://api.rilog.test') {
		if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return originalFetch(input, init);
		throw new Error(`Unexpected external HTTP request: ${url.origin}${url.pathname}`);
	}
	if (url.pathname === '/v1/the-rilog') {
		if (process.env.THE_RILOG_SERVER_FIXTURE_REQUEST_LOG) {
			await appendFile(process.env.THE_RILOG_SERVER_FIXTURE_REQUEST_LOG, `${url.pathname}\n`);
		}
		const statePath = process.env.THE_RILOG_SERVER_FIXTURE_STATE_PATH;
		let state = {};
		if (statePath) {
			try {
				state = JSON.parse(await readFile(statePath, 'utf8'));
			} catch (error) {
				if (error.code !== 'ENOENT') throw error;
			}
		}
		if (state.mode === 'unavailable') return Response.json({ message: 'Unavailable' }, { status: 503 });
		if (state.mode === 'invalid') return envelope({ ...data, spotlights: 'invalid' });
		if (state.mode === 'empty') return envelope({ ...data, news: null, date: null, spotlights: [] });
		return envelope({
			...data,
			spotlights: data.spotlights.map((article, index) =>
				state.mode === 'updated' && index === 0 ? { ...article, title: '갱신된 기업 기사' } : article,
			),
		});
	}
	const detailMatch = url.pathname.match(/^\/v1\/blogs\/the_rilog\/posts\/(\d+)$/);
	if (detailMatch) {
		const detail = postDetail(Number(detailMatch[1]));
		return detail ? envelope(detail) : Response.json({ errorCode: 'POST_NOT_FOUND' }, { status: 404 });
	}
	if (url.pathname === '/v1/blogs/the_rilog') {
		return envelope({
			type: 'RILOG',
			id: 1,
			name: 'The Rilog.',
			slug: data.blogSlug,
			introduction: null,
			profileImageUrl: null,
			coverImageUrl: null,
			serviceUrl: null,
			githubUrl: null,
			memberCount: 1,
			postCount: 3,
		});
	}
	throw new Error(`No server HTTP fixture for ${url.pathname}`);
};
