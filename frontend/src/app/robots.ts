/* eslint-disable import/no-default-export */

import type { MetadataRoute } from 'next';

import { toAbsoluteSiteUrl } from '@/shared/seo/site-url';

const PRIVATE_PATHS = ['/api/', '/auth/', '/write', '/sign-up', '/colog/create', '/*/settings'];

export default function robots(): MetadataRoute.Robots {
	return {
		rules: [
			{ userAgent: '*', allow: '/', disallow: PRIVATE_PATHS },
			{ userAgent: ['OAI-SearchBot', 'Claude-SearchBot', 'PerplexityBot'], allow: '/', disallow: PRIVATE_PATHS },
			{ userAgent: ['ChatGPT-User', 'Claude-User'], allow: '/', disallow: PRIVATE_PATHS },
			{ userAgent: ['GPTBot', 'Google-Extended', 'ClaudeBot'], disallow: '/' },
		],
		sitemap: toAbsoluteSiteUrl('/sitemap.xml'),
	};
}
