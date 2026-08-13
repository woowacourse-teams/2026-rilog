import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import AuthenticatedQueryCacheSubscriber from '@/features/auth/session-expiration/AuthenticatedQueryCacheSubscriber';
import QueryProvider from '@/shared/query/QueryProvider';
import Footer from '@/widgets/footer/Footer';

import './globals.css';

export const metadata: Metadata = {
	title: 'Rilog',
	description: '기록을 작성하고 함께 나누는 공간',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="ko">
			<body className="flex min-h-dvh flex-col">
				<QueryProvider>
					<AuthenticatedQueryCacheSubscriber />
					<div className="flex flex-1 flex-col">{children}</div>
				</QueryProvider>
				<Footer />
			</body>
		</html>
	);
}
