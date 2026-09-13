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
