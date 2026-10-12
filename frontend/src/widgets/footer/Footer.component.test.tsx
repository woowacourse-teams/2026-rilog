import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { ReactNode } from 'react';

import { SITE_NAME } from '@/shared/seo/create-social-metadata';

import Footer from './Footer';

vi.mock('./FooterHomeLink', () => ({
	default: ({ className, children }: { className: string; children: ReactNode }) => (
		<a className={className} href="/feeds" aria-label={`${SITE_NAME} 홈`}>
			{children}
		</a>
	),
}));

describe('Footer', () => {
	it('저작권과 홈·정책 링크를 접근 가능한 이름과 목적지로 제공한다', () => {
		render(<Footer />);

		const footer = screen.getByRole('contentinfo');
		expect(within(footer).getByText(`© ${new Date().getFullYear()} Rilog. All rights reserved.`)).toBeVisible();

		const homeLink = within(footer).getByRole('link', { name: `${SITE_NAME} 홈` });
		expect(homeLink).toHaveAttribute('href', '/feeds');
		expect(within(footer).getByRole('navigation', { name: '정책' })).toBeInTheDocument();
		expect(within(footer).getByRole('link', { name: 'Rilog. 이야기' })).toHaveAttribute('href', '/about');

		const privacyPolicyLink = within(footer).getByRole('link', { name: '개인정보처리방침' });
		expect(privacyPolicyLink).toHaveAttribute(
			'href',
			'https://receptive-sugar-20f.notion.site/Rilog-3c20af5ece568068a244ead52491639b?source=copy_link',
		);
		expect(privacyPolicyLink).toHaveAttribute('target', '_blank');
		expect(privacyPolicyLink).toHaveAttribute('rel', 'noopener noreferrer');

		const termsLink = within(footer).getByRole('link', { name: '이용약관' });
		expect(termsLink).toHaveAttribute(
			'href',
			'https://receptive-sugar-20f.notion.site/Rilog-3c20af5ece568021b809fedd5650c5dd?source=copy_link',
		);
		expect(termsLink).toHaveAttribute('target', '_blank');
		expect(termsLink).toHaveAttribute('rel', 'noopener noreferrer');
		for (const separator of within(footer).getAllByText('·')) {
			expect(separator).toHaveAttribute('aria-hidden', 'true');
		}
	});

	it('각 연락 채널을 접근 가능한 링크로 제공한다', () => {
		render(<Footer />);

		expect(screen.getByRole('link', { name: `${SITE_NAME} 이메일 문의` })).toHaveAttribute(
			'href',
			'mailto:rilog.admin@gmail.com',
		);

		const externalLinks = [
			[`${SITE_NAME} 오픈채팅방`, 'https://open.kakao.com/o/s8RvBMJi'],
			[`${SITE_NAME} Instagram`, 'https://www.instagram.com/rilog_official/'],
			[`${SITE_NAME} Threads`, 'https://www.threads.com/@rilog_official'],
		] as const;

		for (const [name, href] of externalLinks) {
			const link = screen.getByRole('link', { name });

			expect(link).toHaveAttribute('href', href);
			expect(link).toHaveAttribute('target', '_blank');
			expect(link).toHaveAttribute('rel', 'noopener noreferrer');
		}
	});
});
