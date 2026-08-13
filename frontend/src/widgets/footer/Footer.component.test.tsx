import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import Footer from './Footer';

describe('Footer', () => {
	it('브랜드와 정책 및 저작권 정보를 안내한다', () => {
		render(<Footer />);

		const footer = screen.getByRole('contentinfo');

		const homeLink = within(footer).getByRole('link', { name: 'Rilog 홈' });
		expect(homeLink).toHaveAttribute('href', '/');
		expect(homeLink.querySelector('img')).toHaveAttribute('src', '/brand/logo.svg');
		expect(within(footer).getByText('기록을 작성하고 함께 나누는 공간')).toBeInTheDocument();
		expect(within(footer).getByRole('navigation', { name: '정책' })).toBeInTheDocument();
		expect(within(footer).getByRole('link', { name: '개인정보처리방침' })).toHaveAttribute('href', '/privacy');
		expect(within(footer).getByRole('link', { name: '이용약관' })).toHaveAttribute('href', '/terms');
		expect(within(footer).getByText(`© ${new Date().getFullYear()} Rilog. All rights reserved.`)).toBeInTheDocument();
	});

	it('각 연락 채널을 접근 가능한 링크로 제공한다', () => {
		render(<Footer />);

		expect(screen.getByRole('link', { name: 'Rilog 이메일 문의' })).toHaveAttribute('href', 'mailto:contact@rilog.dev');

		const externalLinks = [
			['Rilog Google Form 문의', 'https://docs.google.com/forms/'],
			['Rilog Instagram', 'https://www.instagram.com/'],
			['Rilog Threads', 'https://www.threads.net/'],
		] as const;

		for (const [name, href] of externalLinks) {
			const link = screen.getByRole('link', { name });

			expect(link).toHaveAttribute('href', href);
			expect(link).toHaveAttribute('target', '_blank');
			expect(link).toHaveAttribute('rel', 'noopener noreferrer');
		}

		const iconSources = [
			['Rilog 이메일 문의', '/icons/contact/email.svg'],
			['Rilog Google Form 문의', '/icons/contact/google-form.svg'],
			['Rilog Instagram', '/icons/contact/instagram.svg'],
			['Rilog Threads', '/icons/contact/threads.svg'],
		] as const;

		for (const [name, src] of iconSources) {
			expect(screen.getByRole('link', { name }).querySelector('img')).toHaveAttribute('src', src);
		}
	});
});
