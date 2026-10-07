import { APP_ROUTES } from '@/shared/routes/app-routes';

const STATIC_ROUTES = new Set<string>(['/', ...Object.values(APP_ROUTES)]);
const BLOG_ROUTE_TEMPLATES = {
	home: '/blog/[slug]',
	post: '/blog/[slug]/posts/[postId]',
	markdown: '/blog/[slug]/posts/[postId]/markdown',
	settings: '/blog/[slug]/settings',
} as const;
const BLOG_ROUTES = [
	{ clientPattern: /^\/@[^/]+$/, template: BLOG_ROUTE_TEMPLATES.home },
	{
		clientPattern: /^\/@[^/]+\/posts\/[^/]+$/,
		template: BLOG_ROUTE_TEMPLATES.post,
	},
	{
		clientPattern: /^\/@[^/]+\/posts\/[^/]+\/markdown$/,
		template: BLOG_ROUTE_TEMPLATES.markdown,
	},
	{
		clientPattern: /^\/@[^/]+\/settings$/,
		template: BLOG_ROUTE_TEMPLATES.settings,
	},
] as const;

export function normalizeSentryRoute(path: string): string | null {
	if (STATIC_ROUTES.has(path)) return path;
	return (
		BLOG_ROUTES.find(({ clientPattern, template }) => path === template || clientPattern.test(path))?.template ?? null
	);
}
