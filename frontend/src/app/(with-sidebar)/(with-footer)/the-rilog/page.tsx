import { connection } from 'next/server';

import type { Metadata } from 'next';

import { APP_ROUTES } from '@/shared/routes/app-routes';
import { createSocialMetadata, DEFAULT_OG_IMAGE, SITE_NAME } from '@/shared/seo/create-social-metadata';
import { DAILY_HEADLINES, MAGAZINE_ARTICLES } from '@/widgets/the-rilog/model/magazine-content';
import TheRilogMagazine from '@/widgets/the-rilog/ui/TheRilogMagazine';

const THE_RILOG_TITLE = `The ${SITE_NAME}`;
const THE_RILOG_DESCRIPTION = `개발 분야의 사람, 기업, 기술을 한눈에 읽는 ${SITE_NAME}의 매거진`;

export const metadata: Metadata = {
	title: THE_RILOG_TITLE,
	description: THE_RILOG_DESCRIPTION,
	alternates: { canonical: APP_ROUTES.theRilog },
	...createSocialMetadata({
		description: THE_RILOG_DESCRIPTION,
		image: DEFAULT_OG_IMAGE,
		title: THE_RILOG_TITLE,
		type: 'website',
		url: APP_ROUTES.theRilog,
	}),
};

export default async function TheRilogPage() {
	await connection();
	return <TheRilogMagazine dailyHeadlines={DAILY_HEADLINES} articles={MAGAZINE_ARTICLES} />;
}
