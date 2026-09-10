/* eslint-disable import/no-default-export */

import type { MetadataRoute } from 'next';

import { APP_ROUTES } from '@/shared/routes/app-routes';
import { toAbsoluteSiteUrl } from '@/shared/seo/site-url';

export default function sitemap(): MetadataRoute.Sitemap {
	return [{ url: toAbsoluteSiteUrl(APP_ROUTES.feeds) }, { url: toAbsoluteSiteUrl(APP_ROUTES.about) }];
}
