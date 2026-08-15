import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	agentRules: false,
	serverExternalPackages: ['@blocknote/server-util'],
};

export default nextConfig;
