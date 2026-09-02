/* eslint-disable import/no-default-export */

import type { MetadataRoute } from 'next';

import { toAbsoluteSiteUrl } from '@/shared/seo/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
	return [{ url: toAbsoluteSiteUrl('/feeds') }];
}
