import type { MagazineContent } from '../model/magazine';
import type { Block } from '@blocknote/core';

import { extractPostHeadingAnchors } from '@/features/post-detail/lib/extract-post-table-of-contents';
import type { DailyHeadline } from '@/features/the-rilog-daily-headlines/model/daily-headline';
import type { TheRilogResponse } from '@/shared/api/the-rilog/types';
import { buildPostDetailPath } from '@/shared/routes/app-routes';

const normalizeTitle = (title: string) => title.normalize('NFC').trim().replace(/\s+/g, ' ');

const mapHeadlines = (data: TheRilogResponse, newsContent: Block[] | null): DailyHeadline[] => {
	if (data.news === null) {
		if (newsContent !== null) throw new Error('뉴스가 없는 입력에 뉴스 본문이 포함되어 있습니다.');
		return [];
	}
	if (newsContent === null) throw new Error('헤드라인 링크를 검증할 뉴스 본문이 필요합니다.');
	const { news } = data;
	const anchors = extractPostHeadingAnchors(newsContent);
	if (anchors.length !== news.headlines.length) throw new Error('헤드라인과 본문의 제목 개수가 일치하지 않습니다.');
	return anchors.map((anchor, index) => {
		const headline = news.headlines[index];
		if (!headline || normalizeTitle(headline.title) !== normalizeTitle(anchor.text)) {
			throw new Error(`헤드라인 ${index + 1}과 본문의 제목이 일치하지 않습니다.`);
		}
		return {
			id: `${news.postId}:${anchor.blockId}`,
			title: headline.title,
			href: `${buildPostDetailPath(news.slug, String(news.postId))}#${encodeURIComponent(anchor.id)}`,
		};
	});
};

export const mapTheRilogContent = (data: TheRilogResponse, newsContent: Block[] | null): MagazineContent => ({
	dailyHeadlines: mapHeadlines(data, newsContent),
	articles: data.spotlights.map((article) => ({
		id: String(article.postId),
		title: article.title,
		summary: article.description,
		thumbnailImageUrl: article.thumbnailImageUrl,
		href: buildPostDetailPath(article.slug, String(article.postId)),
		profile: {
			type: article.articleType === 'enterprise' ? 'enterprise' : 'bloger',
			name: article.source?.sourceProfileName ?? '출처 정보 없음',
			profileImageUrl: article.source?.sourceProfileImage ?? null,
		},
	})),
});
