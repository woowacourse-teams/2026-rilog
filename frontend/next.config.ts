import type { NextConfig } from 'next';

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
};

export default nextConfig;
