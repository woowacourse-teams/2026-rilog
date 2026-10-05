import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DAILY_HEADLINES, MAGAZINE_ARTICLES } from '../model/magazine-content';

import TheRilogMagazine from './TheRilogMagazine';

describe('TheRilogMagazine', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-10-04T15:30:00Z'));
		vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('기업 3개와 개인 2개를 이름과 상세 링크가 있는 서로 다른 섹션으로 제공한다', () => {
		render(<TheRilogMagazine dailyHeadlines={DAILY_HEADLINES} articles={MAGAZINE_ARTICLES} />);
		const enterprise = screen.getByRole('region', { name: 'Enterprise Articles' });
		const personal = screen.getByRole('region', { name: 'Personal Articles' });
		expect(within(enterprise).getAllByRole('article')).toHaveLength(3);
		expect(within(personal).getAllByRole('article')).toHaveLength(2);
		for (const [region, names, ids] of [
			[
				enterprise,
				['오픈소스 스튜디오', 'Rilog Labs', '플랫폼 스튜디오'],
				['open-source-trust', 'browser-experiments', 'company-platforms'],
			],
			[personal, ['리로', '하루'], ['people-behind-tools', 'small-model-choice']],
		] as const) {
			expect(
				within(region)
					.getAllByRole('link')
					.map((link) => link.getAttribute('href')),
			).toEqual(ids.map((id) => `/the-rilog/articles/${id}`));
			for (const name of names) {
				expect(within(region).getByText(`${name}.`)).toBeInTheDocument();
				expect(within(region).getByRole('img', { name: `${name} 프로필` })).toBeInTheDocument();
			}
		}
	});

	it('다시 렌더링해도 기업과 개인 기사의 읽는 순서를 바꾸지 않는다', () => {
		const { rerender } = render(<TheRilogMagazine dailyHeadlines={DAILY_HEADLINES} articles={MAGAZINE_ARTICLES} />);
		const before = screen
			.getAllByRole('article')
			.map((article) => within(article).getByRole('link').getAttribute('href'));
		rerender(<TheRilogMagazine dailyHeadlines={DAILY_HEADLINES} articles={MAGAZINE_ARTICLES} />);
		expect(
			screen.getAllByRole('article').map((article) => within(article).getByRole('link').getAttribute('href')),
		).toEqual(before);
	});

	it('한국 시간 날짜와 전용 소개 링크를 제공한다', () => {
		render(<TheRilogMagazine dailyHeadlines={DAILY_HEADLINES} articles={MAGAZINE_ARTICLES} />);
		expect(screen.getByRole('heading', { level: 1, name: 'THE Rilog.' })).toBeInTheDocument();
		expect(screen.getByText('2026.10.05')).toHaveAttribute('datetime', '2026-10-05');
		expect(screen.getByRole('link', { name: 'about. The Rilog.' })).toHaveAttribute('href', '/the-rilog/about');
	});

	it('기사가 없으면 잘못된 상세 링크를 만들지 않는다', () => {
		render(<TheRilogMagazine dailyHeadlines={[]} articles={[]} />);
		expect(screen.queryByRole('article')).not.toBeInTheDocument();
		expect(screen.getAllByRole('link')).toHaveLength(1);
	});
});
