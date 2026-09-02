import type { Metadata } from 'next';

import type { BlogPublicProfile } from '@/domains/blog/model/blog';

export const createBlogMetadata = (profile: BlogPublicProfile): Metadata => {
	const canonical = `/@${encodeURIComponent(profile.slug)}`;
	const description = profile.description?.trim() || `${profile.name}의 Rilog 블로그입니다.`;
	const image = profile.type === 'COLOG' && profile.coverImageUrl ? profile.coverImageUrl : '/opengraph-image';
	return {
		alternates: { canonical },
		description,
		openGraph: { description, images: [image], title: profile.name, type: 'website', url: canonical },
		title: profile.name,
		twitter: { card: 'summary_large_image', images: [image], title: profile.name },
	};
};
