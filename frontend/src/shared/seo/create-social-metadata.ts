export const DEFAULT_OG_IMAGE = '/images/default-og-image.png';
export const SITE_DESCRIPTION = 'Rilog.는 깊이 있는 기록과 지식 공유를 위한 블로그 플랫폼입니다.';
export const SITE_NAME = 'Rilog.';

interface SocialMetadataOptions {
	description: string;
	image: string;
	title: string;
	type: 'article' | 'website';
	url: string;
	authors?: string[];
	publishedTime?: string;
}

export const createSocialMetadata = ({
	authors,
	description,
	image,
	publishedTime,
	title,
	type,
	url,
}: SocialMetadataOptions) => ({
	openGraph: {
		authors,
		description,
		images: [image],
		locale: 'ko_KR',
		publishedTime,
		siteName: SITE_NAME,
		title,
		type,
		url,
	},
	twitter: { card: 'summary_large_image' as const, description, images: [image], title },
});
