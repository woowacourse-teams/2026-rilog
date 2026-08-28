import localFont from 'next/font/local';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import AnalyticsIdentitySubscriber from '@/features/analytics/ui/AnalyticsIdentitySubscriber';
import AuthenticatedQueryCacheSubscriber from '@/features/auth/ui/AuthenticatedQueryCacheSubscriber';
import AuthProvider from '@/features/auth/ui/AuthProvider';
import LoginModalProvider from '@/features/login/model/LoginModalProvider';
import QueryProvider from '@/shared/query/QueryProvider';

import './globals.css';

const pretendard = localFont({
	src: '../shared/assets/fonts/PretendardVariable.woff2',
	display: 'swap',
	weight: '45 920',
	variable: '--font-pretendard',
	fallback: ['system-ui', 'Arial', 'sans-serif'],
});

export const metadata: Metadata = {
	title: 'Rilog',
	description: '기록을 작성하고 함께 나누는 공간',
	icons: {
		icon: '/brand/favicon.png',
	},
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="ko" className={pretendard.variable}>
			<body>
				<QueryProvider>
					<AuthProvider>
						<LoginModalProvider>
							<AuthenticatedQueryCacheSubscriber />
							<AnalyticsIdentitySubscriber />
							{children}
						</LoginModalProvider>
					</AuthProvider>
				</QueryProvider>
			</body>
		</html>
	);
}
