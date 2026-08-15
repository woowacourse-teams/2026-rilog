import type { NextConfig } from 'next';

interface WebpackConfigWithRules {
	module: {
		rules: unknown[];
	};
}

const nextConfig: NextConfig = {
	agentRules: false,
	images: {
		// TODO(API 연동): Unsplash mock pattern을 실제 이미지 CDN 또는 storage host로 교체
		remotePatterns: [
			{
				protocol: 'https',
				hostname: 'images.unsplash.com',
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
	webpack(config: WebpackConfigWithRules) {
		config.module.rules.push({
			test: /\.svg$/i,
			use: [
				{
					loader: '@svgr/webpack',
					options: {
						icon: true,
					},
				},
			],
		});

		return config;
	},
};

export default nextConfig;
