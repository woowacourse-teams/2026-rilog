import Image from 'next/image';

import type { MagazineArticle } from '../model/magazine-content';

import CologAvatar from '@/domains/blog/ui/CologAvatar';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import type { DailyHeadline } from '@/features/the-rilog-daily-headlines/model/daily-headline';
import DailyHeadlines from '@/features/the-rilog-daily-headlines/ui/DailyHeadlines';
import { APP_ROUTES } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';

import ScrollReveal from './ScrollReveal';
import styles from './the-rilog-magazine.module.css';

interface TheRilogMagazineProps {
	dailyHeadlines: readonly DailyHeadline[];
	articles: readonly MagazineArticle[];
}

interface MagazineArticleCardProps {
	article: MagazineArticle;
	imagePosition?: 'left' | 'right';
}

function MagazineArticleCard({ article, imagePosition = 'left' }: MagazineArticleCardProps) {
	const { profile } = article;
	return (
		<article
			className={styles.card}
			data-kind={profile.type === 'enterprise' ? 'enterprise' : 'personal'}
			data-image-position={imagePosition}
		>
			<div className={styles.cardContent}>
				<div className={styles.artworkFrame} data-thumbnail-ratio={article.thumbnailRatio} aria-hidden="true">
					<div className={styles.artwork} data-artwork={article.artwork}>
						<span className={styles.artworkShape} />
						<span className={styles.artworkDetail} />
					</div>
				</div>
				<div className={styles.cardBody}>
					<div className={styles.profile}>
						{profile.type === 'bloger' ? (
							<UserAvatar
								src={profile.profileImageUrl}
								fallback={profile.name.slice(0, 1)}
								label={`${profile.name} 프로필`}
								size="sm"
							/>
						) : (
							<CologAvatar
								src={profile.profileImageUrl}
								fallback={profile.name.slice(0, 1)}
								label={`${profile.name} 프로필`}
								size="sm"
							/>
						)}
						<span className={styles.profileName}>{profile.name}.</span>
					</div>
					<h3 className={styles.cardTitle}>
						<CustomLink href={`${APP_ROUTES.theRilog}/articles/${article.id}`} className={styles.cardLink}>
							<span className={styles.cardTitleText}>{article.title}</span>
						</CustomLink>
					</h3>
					<p className={styles.summary}>{article.summary}</p>
				</div>
			</div>
		</article>
	);
}

export default function TheRilogMagazine({ dailyHeadlines, articles }: TheRilogMagazineProps) {
	const enterpriseArticles = articles.filter((article) => article.profile.type === 'enterprise');
	const personalArticles = articles.filter((article) => article.profile.type === 'bloger');
	const now = new Date();
	const calendarParts = new Intl.DateTimeFormat('ko-KR', {
		timeZone: 'Asia/Seoul',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(now);
	const calendarYear = calendarParts.find((part) => part.type === 'year')?.value ?? '';
	const calendarMonth = calendarParts.find((part) => part.type === 'month')?.value ?? '';
	const calendarDay = calendarParts.find((part) => part.type === 'day')?.value ?? '';
	const calendarDate = `${calendarYear}.${calendarMonth}.${calendarDay}`;
	const calendarDateIso = `${calendarYear}-${calendarMonth}-${calendarDay}`;
	return (
		<main className={styles.page}>
			<header>
				<div className={styles.masthead}>
					<div className={styles.edition} aria-label="발행 정보">
						<time dateTime={calendarDateIso}>{calendarDate}</time>
						<CustomLink href={`${APP_ROUTES.theRilog}/about`}>about. The Rilog.</CustomLink>
					</div>
					<h1 aria-label="THE Rilog.">
						<span className={styles.titleWord}>THE</span>
						<span className={styles.foxFrame}>
							<Image className={styles.fox} src="/brand/the-rilog-fox.webp" alt="" width={640} height={640} priority />
						</span>
						<span className={styles.logoFrame}>
							<Image className={styles.brandLogo} src="/brand/logo.svg" alt="" width={1186} height={472} priority />
						</span>
					</h1>
				</div>
			</header>
			<div className={styles.stories}>
				<div className={styles.contentGrid}>
					<DailyHeadlines dailyHeadlines={dailyHeadlines} />
					<section className={styles.enterpriseArticlesSection} aria-labelledby="enterprise-articles-heading">
						<div className={styles.sectionHeading}>
							<h2 id="enterprise-articles-heading">Enterprise Articles</h2>
							<span>updates Mon &amp; Thu</span>
						</div>
						<div className={styles.enterpriseArticleList}>
							{enterpriseArticles.map((article) => (
								<MagazineArticleCard key={article.id} article={article} />
							))}
						</div>
					</section>
				</div>
				<section className={styles.personalArticlesSection} aria-labelledby="personal-articles-heading">
					<div className={styles.sectionHeading}>
						<h2 id="personal-articles-heading">Personal Articles</h2>
						<span>updates Mon &amp; Thu</span>
					</div>
					<div className={styles.personalArticleList}>
						{personalArticles.map((article, index) => (
							<ScrollReveal className={`${styles.personalArticleRow} ${styles.scrollReveal}`} key={article.id}>
								<MagazineArticleCard article={article} imagePosition={index === 0 ? 'left' : 'right'} />
							</ScrollReveal>
						))}
					</div>
				</section>
			</div>
		</main>
	);
}
