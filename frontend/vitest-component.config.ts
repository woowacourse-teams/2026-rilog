import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [
		react(),
		svgr({
			include: '**/*.svg',
			svgrOptions: {
				icon: true,
			},
		}),
	],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	test: {
		environment: 'jsdom',
		include: ['src/**/*.component.test.tsx'],
		setupFiles: ['./src/test/setup.ts'],
	},
});
