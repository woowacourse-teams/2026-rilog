import { Suspense } from 'react';

import type { Metadata } from 'next';

import GitHubCallbackHandler from '@/features/login/ui/GitHubCallbackHandler';

export const metadata: Metadata = {
	robots: { follow: false, index: false },
	title: '로그인 처리',
};

export default function GitHubCallbackPage() {
	return (
		<Suspense
			fallback={
				<div className="flex min-h-screen items-center justify-center">
					<p className="text-body-1 text-text-secondary">로그인 처리 중입니다...</p>
				</div>
			}
		>
			<GitHubCallbackHandler />
		</Suspense>
	);
}
