import { createHash } from 'node:crypto';

import { isBlockNoteDocument } from '@/domains/post/lib/validate-blocknote-document';
import type { PostContentBlock } from '@/domains/post/model/post-content';
import { isRecord } from '@/shared/api/response-validation';
import { isTheRilogResponse } from '@/shared/api/the-rilog/response-guards';
import type { TheRilogResponse } from '@/shared/api/the-rilog/types';

import { mapTheRilogContent } from '../lib/map-the-rilog-content';

export interface TheRilogSnapshot {
	schemaVersion: 1;
	source: 'api' | 'fixture';
	capturedAt: string;
	data: TheRilogResponse;
	newsContent: PostContentBlock[] | null;
	checksum: string;
}

// Object insertion order must not change the checksum when a JSON input is saved again.
const canonicalize = (value: unknown): unknown => {
	if (Array.isArray(value)) return value.map(canonicalize);
	if (isRecord(value)) {
		return Object.fromEntries(
			Object.keys(value)
				.sort()
				.map((key) => [key, canonicalize(value[key])]),
		);
	}
	return value;
};

const checksum = (data: TheRilogResponse, newsContent: PostContentBlock[] | null) =>
	createHash('sha256')
		.update(JSON.stringify(canonicalize({ data, newsContent })))
		.digest('hex');

// Persist only the public fields that this page consumes, even when an API adds extra metadata.
const pickPublicData = (data: TheRilogResponse): TheRilogResponse => ({
	blogSlug: data.blogSlug,
	date: data.date,
	news:
		data.news === null
			? null
			: {
					postId: data.news.postId,
					slug: data.news.slug,
					title: data.news.title,
					publishedAt: data.news.publishedAt,
					headlines: data.news.headlines.map(({ title }) => ({ title })),
				},
	spotlights: data.spotlights.map((article) => ({
		postId: article.postId,
		slug: article.slug,
		articleType: article.articleType,
		title: article.title,
		description: article.description,
		thumbnailImageUrl: article.thumbnailImageUrl,
		publishedAt: article.publishedAt,
		source:
			article.source === null
				? null
				: {
						sourceProfileName: article.source.sourceProfileName,
						sourceProfileImage: article.source.sourceProfileImage,
					},
	})),
});

export const createTheRilogSnapshot = (
	data: TheRilogResponse,
	newsContent: PostContentBlock[] | null,
	source: TheRilogSnapshot['source'],
	capturedAt = new Date().toISOString(),
): TheRilogSnapshot => {
	if (!isTheRilogResponse(data) || (newsContent !== null && !isBlockNoteDocument(newsContent))) {
		throw new Error('더 리로그 빌드 입력 형식이 올바르지 않습니다.');
	}
	if (!Number.isFinite(Date.parse(capturedAt))) throw new Error('더 리로그 수집 시각이 올바르지 않습니다.');
	const publicData = pickPublicData(data);
	mapTheRilogContent(publicData, newsContent);
	return {
		schemaVersion: 1,
		source,
		capturedAt,
		data: publicData,
		newsContent,
		checksum: checksum(publicData, newsContent),
	};
};

export const parseTheRilogSnapshot = (value: unknown): TheRilogSnapshot => {
	if (
		!isRecord(value) ||
		value.schemaVersion !== 1 ||
		(value.source !== 'api' && value.source !== 'fixture') ||
		typeof value.capturedAt !== 'string' ||
		!isTheRilogResponse(value.data) ||
		(value.newsContent !== null && !isBlockNoteDocument(value.newsContent)) ||
		typeof value.checksum !== 'string'
	)
		throw new Error('더 리로그 스냅샷 형식이 올바르지 않습니다.');
	const snapshot = createTheRilogSnapshot(value.data, value.newsContent, value.source, value.capturedAt);
	if (snapshot.checksum !== value.checksum) throw new Error('더 리로그 스냅샷 checksum이 일치하지 않습니다.');
	return snapshot;
};

export const captureTheRilogSnapshot = async (): Promise<TheRilogSnapshot> => {
	const { readTheRilog } = await import('@/shared/api/the-rilog/api');
	const { readPostDetail } = await import('@/shared/api/posts/api');
	const { data } = await readTheRilog();
	let newsContent: PostContentBlock[] | null = null;
	if (data.news !== null) {
		const response = await readPostDetail({ slug: data.news.slug, postId: data.news.postId }, { cache: 'no-store' });
		if (!response.data) throw new Error('뉴스 게시글 상세 응답이 없습니다.');
		newsContent = response.data.content;
	}
	return createTheRilogSnapshot(data, newsContent, 'api');
};
