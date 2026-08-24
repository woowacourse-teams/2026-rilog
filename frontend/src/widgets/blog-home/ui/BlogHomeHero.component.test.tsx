import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BlogPublicProfile } from '@/domains/blog/model/blog';

import BlogHomeHero from './BlogHomeHero';

vi.mock('@/features/colog-settings-access/ui/CologSettingsButton', () => ({
	default: function MockCologSettingsButton({ slug, isOnCover: _isOnCover }: { slug: string; isOnCover?: boolean }) {
		return <a href={`/@${slug}/settings?tab=profile`}>코로그 설정</a>;
	},
}));

const COLOG_PROFILE: BlogPublicProfile = {
	type: 'COLOG',
	id: 1,
	name: '리로그 팀',
	slug: 'rilog-team',
	description: '함께 쓰는 기술 블로그',
	profileImageUrl: null,
	coverImageUrl: '/images/colog-placeholder.svg',
	serviceUrl: undefined,
	githubUrl: undefined,
	memberCount: 5,
	postCount: 10,
};

describe('BlogHomeHero', () => {
	it('COLOG 프로필에만 설정 action을 제공한다', () => {
		render(<BlogHomeHero profile={COLOG_PROFILE} />);

		expect(screen.getByRole('link', { name: '코로그 설정' })).toHaveAttribute(
			'href',
			'/@rilog-team/settings?tab=profile',
		);
	});

	it('RILOG 프로필에는 설정 action을 제공하지 않는다', () => {
		render(
			<BlogHomeHero
				profile={{
					...COLOG_PROFILE,
					type: 'RILOG',
					name: '파라디',
					slug: 'jetproc',
					memberCount: 1,
				}}
			/>,
		);

		expect(screen.queryByRole('link', { name: '코로그 설정' })).not.toBeInTheDocument();
		expect(screen.getByRole('img', { name: '파라디 개인 블로그 프로필' })).toBeInTheDocument();
	});
});
