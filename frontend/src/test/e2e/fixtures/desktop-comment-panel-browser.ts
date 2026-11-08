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
		plugins: [
			{
				name: 'desktop-comment-article-fixture',
				enforce: 'pre',
				transform(source: string, id: string) {
					if (!id.endsWith('/fixtures/InlineCommentWorkspace.tsx')) return;
					const html = Array.from(
						{ length: 80 },
						(_, index) =>
							`<div class="bn-block-outer"><div class="bn-block" data-id="block-${index + 1}"><div class="bn-block-content" data-content-type="paragraph"><p class="bn-inline-content" data-inline-comment-root data-inline-comment-block-id="block-${index + 1}">${index + 1}. Rilog 본문을 읽던 위치를 유지합니다. ${'댓글 창을 열고 닫아도 이어 읽을 수 있어야 합니다. '.repeat(8)}</p></div></div></div>`,
					).join('');
					return source
						.replace('html=""', `html={${JSON.stringify(html)}}`)
						.replace('profileSection={null}', 'profileSection={<a href="#continued">작성자 프로필</a>}');
				},
			},
			react(),
			svgr({ include: '**/*.svg' }),
		],
		resolve: {
			alias: [{ find: '@', replacement: fileURLToPath(new URL('../../../', import.meta.url)) }],
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

export const renderDesktopCommentWorkspace = async (page: Page, selectionId?: number) => {
	bundle ??= buildWorkspace();
	const { code, css } = await bundle;
	const params = new URLSearchParams();
	if (selectionId !== undefined) params.set('selectionId', String(selectionId));
	// Read the real generated stylesheet links without mounting a throwaway Next runtime.
	// Mounting /about then replacing its DOM leaves auth requests and router listeners behind.
	const response = await page.request.get('/about');
	const html = await response.text();
	const styles = (html.match(/<link\b[^>]*>/g) ?? []).filter((link) => /rel=["']stylesheet["']/.test(link)).join('');
	if (!styles) throw new Error('브라우저 fixture에 실제 앱 스타일시트가 필요합니다.');
	const fixtureUrl = `/about${params.size > 0 ? `?${params}` : ''}`;
	const absoluteUrl = new URL(fixtureUrl, response.url()).href;
	await page.route(
		absoluteUrl,
		(route) =>
			route.fulfill({
				contentType: 'text/html',
				body: `<html><head>${styles}</head><body><div id="root"></div></body></html>`,
			}),
		{ times: 1 },
	);
	await page.goto(fixtureUrl);
	await page.addStyleTag({ content: css });
	await page.addScriptTag({ content: code });
};
