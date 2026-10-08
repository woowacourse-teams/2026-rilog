import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';

import type { Page } from '@playwright/test';

// Vitest와 같은, lockfile에 고정된 Vite를 사용한다. 앱에 테스트용 route를 추가하지 않는다.
const require = createRequire(import.meta.url);
const vitePath = createRequire(require.resolve('vitest/config')).resolve('vite');
interface WorkspaceBundle {
	code: string;
	css: string;
}

let bundle: Promise<WorkspaceBundle> | undefined;
const buildWorkspace = async (): Promise<WorkspaceBundle> => {
	const { build } = (await import(vitePath)) as {
		build: (
			config: object,
		) => Promise<{ output: { type: string; code?: string; fileName: string; source?: string | Uint8Array }[] }[]>;
	};
	const result = await build({
		configFile: false,
		logLevel: 'error',
		plugins: [react(), svgr({ include: '**/*.svg' })],
		resolve: {
			alias: [
				{
					find: '@/features/post-detail/ui/PostDetailContent',
					replacement: fileURLToPath(new URL('./InlineCommentContent.tsx', import.meta.url)),
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
				entry: fileURLToPath(new URL('./InlineCommentWorkspace.tsx', import.meta.url)),
				name: 'InlineCommentFixture',
				formats: ['iife'],
			},
		},
	});
	const output = result.flatMap((item) => item.output);
	const code = output.find((item) => item.type === 'chunk')?.code;
	if (!code) throw new Error('인라인 댓글 브라우저 fixture 빌드 실패');
	const css = output
		.filter((item) => item.type === 'asset' && item.fileName.endsWith('.css'))
		.map((item) => (typeof item.source === 'string' ? item.source : new TextDecoder().decode(item.source)))
		.join('\n');
	if (!css) throw new Error('인라인 댓글 브라우저 fixture 스타일 빌드 실패');
	return { code, css };
};

export const renderInlineCommentWorkspace = async (page: Page) => {
	bundle ??= buildWorkspace();
	const { code, css } = await bundle;
	await page.goto('/about');
	const styles = await page
		.locator('link[rel="stylesheet"]')
		.evaluateAll((links) =>
			links.map((link) => `<link rel="stylesheet" href="${(link as HTMLLinkElement).href}">`).join(''),
		);
	await page.setContent(`<html><head>${styles}</head><body><div id="root"></div></body></html>`);
	await page.addStyleTag({ content: css });
	await page.addScriptTag({ content: code });
};
