import type { Metadata } from 'next';

import type { BlogPublicProfile } from '@/domains/blog/model/blog';
import { createSocialMetadata, DEFAULT_OG_IMAGE } from '@/shared/seo/create-social-metadata';
import { getImageUrl } from '@/shared/utils/get-image-url';

export const createBlogMetadata = (profile: BlogPublicProfile): Metadata => {
	const canonical = `/@${encodeURIComponent(profile.slug)}`;
	const description = profile.description?.trim() || `${profile.name}의 Rilog 블로그입니다.`;
	const image = getImageUrl(profile.type === 'COLOG' ? profile.coverImageUrl : null) || DEFAULT_OG_IMAGE;
	return {
		alternates: { canonical },
		description,
		title: profile.name,
		...createSocialMetadata({ description, image, title: profile.name, type: 'website', url: canonical }),
	};
};
