import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

import type { Page } from '@playwright/test';

// Vitest와 같은, lockfile에 고정된 Vite를 사용한다. 앱에 테스트용 route를 추가하지 않는다.
const require = createRequire(import.meta.url);
const vitePath = createRequire(require.resolve('vitest/config')).resolve('vite');
let bundle: Promise<string> | undefined;
const buildWorkspace = async (): Promise<string> => {
	const { build } = (await import(vitePath)) as {
		build: (config: object) => Promise<{ output: { type: string; code?: string }[] }[]>;
	};
	const result = await build({
		configFile: false,
		logLevel: 'error',
		plugins: [react(), svgr({ include: '**/*.svg' })],
		resolve: {
			alias: [
				{
					find: '@/features/analytics/model/events',
					replacement: fileURLToPath(new URL('./reading-analytics.ts', import.meta.url)),
				},
				{ find: '@', replacement: fileURLToPath(new URL('../../../', import.meta.url)) },
			],
		},
		define: {
			'process.env.NEXT_PUBLIC_API_BASE_URL': JSON.stringify('https://api.rilog.test'),
			'process.env.NODE_ENV': JSON.stringify('production'),
			'process.env': JSON.stringify({ NODE_ENV: 'production', NEXT_PUBLIC_API_BASE_URL: 'https://api.rilog.test' }),
		},
		build: {
			write: false,
			minify: false,
			lib: {
				entry: fileURLToPath(new URL('./ReadingContent.tsx', import.meta.url)),
				name: 'ReadingFixture',
				formats: ['iife'],
			},
		},
	});
	const code = result.flatMap((item) => item.output).find((item) => item.type === 'chunk')?.code;
	if (!code) throw new Error('읽기 브라우저 fixture 빌드 실패');
	return code;
};

export const renderReadingContent = async (
	page: Page,
	{ postId, articleHeight }: { postId: number; articleHeight: number },
) => {
	bundle ??= buildWorkspace();
	const code = await bundle;
	await page.route('**/*', (route) =>
		route.request().isNavigationRequest()
			? route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' })
			: route.abort(),
	);
	await page.goto(`/reader/posts/${postId}`);
	await page.setContent(
		`<html><head></head><body style="margin: 0"><div id="root" data-post-id="${postId}" data-article-height="${articleHeight}"></div></body></html>`,
	);
	await page.addScriptTag({ content: code });
};
