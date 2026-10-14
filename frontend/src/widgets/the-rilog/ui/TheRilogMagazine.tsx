import type { MagazineArticle } from '../model/magazine-content';

import type { DailyHeadline } from '@/features/the-rilog-daily-headlines/model/daily-headline';
import DailyHeadlines from '@/features/the-rilog-daily-headlines/ui/DailyHeadlines';

import MagazineArticleCard from './MagazineArticleCard';
import MagazineMasthead from './MagazineMasthead';
import ScrollReveal from './ScrollReveal';
import styles from './the-rilog-magazine.module.css';

interface TheRilogMagazineProps {
	dailyHeadlines: readonly DailyHeadline[];
	articles: readonly MagazineArticle[];
}

export default function TheRilogMagazine({ dailyHeadlines, articles }: TheRilogMagazineProps) {
	const enterpriseArticles = articles.filter((article) => article.profile.type === 'enterprise');
	const personalArticles = articles.filter((article) => article.profile.type === 'bloger');
	return (
		<main className={`${styles.page} mx-auto w-full max-w-7xl px-6 md:px-16`}>
			<MagazineMasthead />
			<div className={styles.stories}>
				<div className={styles.contentGrid}>
					<DailyHeadlines dailyHeadlines={dailyHeadlines} />
					<section className={styles.enterpriseArticlesSection} aria-labelledby="enterprise-articles-heading">
						<div className={styles.sectionHeading}>
							<h2 id="enterprise-articles-heading">Enterprise Spotlight</h2>
							<span>updates on Mon &amp; Thu</span>
						</div>
						<div className={styles.enterpriseArticleList}>
							{enterpriseArticles.length === 0 && <p className={styles.empty}>아직 등록된 아티클이 없습니다.</p>}
							{enterpriseArticles.map((article) => (
								<ScrollReveal className={`${styles.articleRow} ${styles.scrollReveal}`} key={article.id}>
									<MagazineArticleCard article={article} />
								</ScrollReveal>
							))}
						</div>
					</section>
				</div>
				<section className={styles.personalArticlesSection} aria-labelledby="personal-articles-heading">
					<div className={styles.sectionHeading}>
						<h2 id="personal-articles-heading">Personal Spotlight</h2>
						<span>updates on Mon &amp; Thu</span>
					</div>
					<div className={styles.personalArticleList}>
						{personalArticles.length === 0 && <p className={styles.empty}>아직 등록된 아티클이 없습니다.</p>}
						{personalArticles.map((article, index) => (
							<ScrollReveal className={`${styles.articleRow} ${styles.scrollReveal}`} key={article.id}>
								<MagazineArticleCard article={article} imagePosition={index === 0 ? 'left' : 'right'} />
							</ScrollReveal>
						))}
					</div>
				</section>
			</div>
		</main>
	);
}
