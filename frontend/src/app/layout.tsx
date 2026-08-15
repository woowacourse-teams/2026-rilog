import localFont from 'next/font/local';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import AuthenticatedQueryCacheSubscriber from '@/features/auth/ui/AuthenticatedQueryCacheSubscriber';
import LoginModalProvider from '@/features/login/model/LoginModalProvider';
import QueryProvider from '@/shared/query/QueryProvider';
import Footer from '@/widgets/footer/Footer';

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
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="ko" className={pretendard.variable}>
			<body>
				<QueryProvider>
					<LoginModalProvider>
						<AuthenticatedQueryCacheSubscriber />
						{children}
					</LoginModalProvider>
				</QueryProvider>
				<Footer />
			</body>
		</html>
	);
}
