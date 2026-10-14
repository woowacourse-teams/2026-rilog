import type { Metadata } from 'next';

import { loadTheRilogContent } from '@/features/the-rilog/server/load-the-rilog-content';
import { APP_ROUTES } from '@/shared/routes/app-routes';
import { createSocialMetadata, DEFAULT_OG_IMAGE, SITE_NAME } from '@/shared/seo/create-social-metadata';
import TheRilogMagazine from '@/widgets/the-rilog/ui/TheRilogMagazine';

const THE_RILOG_TITLE = `The ${SITE_NAME}`;
const THE_RILOG_DESCRIPTION = `개발 분야의 사람, 기업, 기술을 한눈에 읽는 ${SITE_NAME}의 매거진`;

export const dynamic = 'force-static';
export const revalidate = false;

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
	const content = await loadTheRilogContent();
	return (
		<TheRilogMagazine
			dailyHeadlines={content.dailyHeadlines}
			articles={content.articles}
			inputChecksum={content.inputChecksum}
			capturedAt={content.capturedAt}
		/>
	);
}
