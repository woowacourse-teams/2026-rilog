export const DEFAULT_OG_IMAGE = '/images/thumbnail-fallback.svg';
export const SITE_DESCRIPTION = '기록을 작성하고 함께 나누는 공간';
export const SITE_NAME = 'Rilog';

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
