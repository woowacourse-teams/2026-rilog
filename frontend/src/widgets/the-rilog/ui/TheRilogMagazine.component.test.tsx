import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { mapTheRilogContent } from '@/features/the-rilog/lib/map-the-rilog-content';
import { createTheRilogFixtureData, createTheRilogFixtureNewsContent } from '@/test/fixtures/the-rilog';

import { DAILY_HEADLINES, MAGAZINE_ARTICLES } from '../model/magazine-content.fixture';

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
		const enterprise = screen.getByRole('region', { name: 'Enterprise Spotlight' });
		const personal = screen.getByRole('region', { name: 'Personal Spotlight' });
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
			).toEqual(ids.map((id) => `/@articles/${id}`));
			for (const name of names) {
				expect(within(region).getByText(`${name}.`)).toBeInTheDocument();
				expect(within(region).getByRole('img', { name: `${name} 프로필` })).toBeInTheDocument();
			}
		}
	});

	it('API 썸네일을 카드에 전달하고 실패 후 주소가 바뀌면 새 이미지를 표시한다', () => {
		const data = createTheRilogFixtureData();
		const article = data.spotlights[0];
		article.thumbnailImageUrl = 'https://images.rilog.test/first.jpg';
		const newsContent = createTheRilogFixtureNewsContent();
		const { rerender } = render(<TheRilogMagazine {...mapTheRilogContent(data, newsContent)} />);
		const card = screen.getByRole('link', { name: article.title }).closest('article')!;
		const image = card.querySelector('img[alt=""]')!;
		expect(decodeURIComponent(image.getAttribute('src') ?? '')).toContain(article.thumbnailImageUrl);

		fireEvent.error(image);
		expect(card.querySelector('img[alt=""]')).toBeNull();

		article.thumbnailImageUrl = 'https://images.rilog.test/second.jpg';
		rerender(<TheRilogMagazine {...mapTheRilogContent(data, newsContent)} />);
		const replacement = card.querySelector('img[alt=""]')!;
		expect(decodeURIComponent(replacement.getAttribute('src') ?? '')).toContain(article.thumbnailImageUrl);
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

	it('제목 원문을 유지하고 기업 설명만 100자 제한을 적용한다', () => {
		const title = '가'.repeat(21);
		const summary = '나'.repeat(101);
		const articles = MAGAZINE_ARTICLES.map((article) => ({ ...article, title, summary }));
		render(<TheRilogMagazine dailyHeadlines={[]} articles={articles} />);
		const enterprise = screen.getByRole('region', { name: 'Enterprise Spotlight' });
		const personal = screen.getByRole('region', { name: 'Personal Spotlight' });
		expect(within(enterprise).getAllByRole('link', { name: title })).toHaveLength(3);
		expect(within(enterprise).getAllByText(`${'나'.repeat(99)}…`)).toHaveLength(3);
		expect(within(personal).getAllByRole('link', { name: title })).toHaveLength(2);
		expect(within(personal).getAllByText(summary)).toHaveLength(2);
	});

	it('한국 시간의 영문 날짜를 제공하고 소개 링크는 표시하지 않는다', () => {
		render(<TheRilogMagazine dailyHeadlines={DAILY_HEADLINES} articles={MAGAZINE_ARTICLES} />);
		expect(screen.getByRole('heading', { level: 1, name: 'THE Rilog.' })).toBeInTheDocument();
		expect(screen.getByText('Monday october 5 2026')).toHaveAttribute('datetime', '2026-10-05');
		expect(screen.queryByRole('link', { name: 'about. The Rilog.' })).not.toBeInTheDocument();
	});

	it('기사가 없으면 잘못된 상세 링크를 만들지 않는다', () => {
		render(<TheRilogMagazine dailyHeadlines={[]} articles={[]} />);
		expect(screen.queryByRole('article')).not.toBeInTheDocument();
		expect(screen.queryAllByRole('link')).toHaveLength(0);
		expect(screen.getAllByText('아직 등록된 아티클이 없습니다.')).toHaveLength(2);
		expect(screen.getByText('아직 등록된 헤드라인이 없습니다.')).toBeInTheDocument();
	});
});
