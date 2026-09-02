import localFont from 'next/font/local';

import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import AnalyticsIdentitySubscriber from '@/features/analytics/ui/AnalyticsIdentitySubscriber';
import AuthenticatedQueryCacheSubscriber from '@/features/auth/ui/AuthenticatedQueryCacheSubscriber';
import AuthProvider from '@/features/auth/ui/AuthProvider';
import LoginModalProvider from '@/features/login/model/LoginModalProvider';
import QueryProvider from '@/shared/query/QueryProvider';
import {
	createSocialMetadata,
	DEFAULT_OG_IMAGE,
	SITE_DESCRIPTION,
	SITE_NAME,
} from '@/shared/seo/create-social-metadata';
import { siteUrl } from '@/shared/seo/site-url';

import './globals.css';

const pretendard = localFont({
	src: '../shared/assets/fonts/PretendardVariable.woff2',
	display: 'swap',
	weight: '45 920',
	variable: '--font-pretendard',
	fallback: ['system-ui', 'Arial', 'sans-serif'],
});

export const metadata: Metadata = {
	metadataBase: siteUrl,
	title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
	description: SITE_DESCRIPTION,
	applicationName: SITE_NAME,
	...createSocialMetadata({
		description: SITE_DESCRIPTION,
		image: DEFAULT_OG_IMAGE,
		title: SITE_NAME,
		type: 'website',
		url: '/feeds',
	}),
	icons: {
		icon: '/brand/favicon.svg',
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
