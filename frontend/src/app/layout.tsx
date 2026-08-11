import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
	title: 'Rilog',
	description: '기록을 작성하고 함께 나누는 공간',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
	return (
		<html lang="ko">
			<body>{children}</body>
		</html>
	);
}
