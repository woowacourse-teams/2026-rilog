import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	agentRules: false,
	serverExternalPackages: ['@blocknote/core', '@blocknote/react', '@blocknote/server-util'],
	redirects() {
		return [
			{
				source: '/',
				destination: '/feeds',
				permanent: true,
			},
		];
	},
	headers() {
		return Promise.resolve([
			{
				source: '/:path*',
				headers: [
					{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
					{ key: 'X-Frame-Options', value: 'DENY' },
					{ key: 'X-Content-Type-Options', value: 'nosniff' },
					{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
					{
						key: 'Content-Security-Policy',
						value:
							"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: blob: https:; font-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none'",
					},
				],
			},
		]);
	},
	rewrites() {
		return Promise.resolve([{ source: '/.well-known/llms.txt', destination: '/llms.txt' }]);
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '**',
				pathname: '/**',
			},
			{
				protocol: 'http',
				hostname: '**',
				pathname: '/**',
			},
		],
	},
	turbopack: {
		rules: {
			'*.svg': {
				loaders: [
					{
						loader: '@svgr/webpack',
						options: {
							icon: true,
						},
					},
				],
				as: '*.js',
			},
		},
	},
};

export default nextConfig;
