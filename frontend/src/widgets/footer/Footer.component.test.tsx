import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Footer from './Footer';

describe('Footer', () => {
	it('저작권, 연락 채널, 정책, 브랜드 순서로 안내한다', () => {
		render(<Footer />);

		const footer = screen.getByRole('contentinfo');
		const copyright = within(footer).getByText(`© ${new Date().getFullYear()} Rilog. All rights reserved.`);
		const links = within(footer).getAllByRole('link');

		expect(copyright.compareDocumentPosition(links[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
		expect(links.map((link) => link.getAttribute('aria-label') ?? link.textContent)).toEqual([
			'Rilog 이메일 문의',
			'Rilog 오픈채팅방',
			'Rilog Instagram',
			'Rilog Threads',
			'Rilog. 이야기',
			'개인정보처리방침',
			'이용약관',
			'Rilog 홈',
		]);

		const homeLink = within(footer).getByRole('link', { name: 'Rilog 홈' });
		expect(homeLink).toHaveAttribute('href', '/feeds');
		expect(homeLink.querySelector('img')).toHaveAttribute('src', '/brand/logo.svg');
		expect(within(footer).queryByText('기록을 작성하고 함께 나누는 공간')).not.toBeInTheDocument();
		expect(within(footer).queryByRole('heading', { name: 'contact' })).not.toBeInTheDocument();
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

		expect(screen.getByRole('link', { name: 'Rilog 이메일 문의' })).toHaveAttribute('href', 'mailto:contact@rilog.dev');

		const externalLinks = [
			['Rilog 오픈채팅방', 'https://open.kakao.com/o/s8RvBMJi'],
			['Rilog Instagram', 'https://www.instagram.com/rilog_official/'],
			['Rilog Threads', 'https://www.threads.com/@rilog_official'],
		] as const;

		for (const [name, href] of externalLinks) {
			const link = screen.getByRole('link', { name });

			expect(link).toHaveAttribute('href', href);
			expect(link).toHaveAttribute('target', '_blank');
			expect(link).toHaveAttribute('rel', 'noopener noreferrer');
		}

		const iconSources = [
			['Rilog 이메일 문의', '/icons/contact/email.svg'],
			['Rilog 오픈채팅방', '/icons/contact/google-form.svg'],
			['Rilog Instagram', '/icons/contact/instagram.svg'],
			['Rilog Threads', '/icons/contact/threads.svg'],
		] as const;

		for (const [name, src] of iconSources) {
			expect(screen.getByRole('link', { name }).querySelector('img')).toHaveAttribute('src', src);
		}
	});
});
