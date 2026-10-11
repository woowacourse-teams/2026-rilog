import type { MagazineArticle } from '../model/magazine-content';

import CologAvatar from '@/domains/blog/ui/CologAvatar';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import { APP_ROUTES } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';

import { formatEnterpriseArticleText } from '../lib/format-enterprise-article-text';

import MagazineArticleSummary from './MagazineArticleSummary';
import styles from './the-rilog-magazine.module.css';

interface MagazineArticleCardProps {
	article: MagazineArticle;
	imagePosition?: 'left' | 'right';
}

export default function MagazineArticleCard({ article, imagePosition = 'left' }: MagazineArticleCardProps) {
	const { profile } = article;
	const isEnterprise = profile.type === 'enterprise';
	const { title, summary } = isEnterprise ? formatEnterpriseArticleText(article) : article;
	return (
		<article
			className={styles.card}
			data-kind={isEnterprise ? 'enterprise' : 'personal'}
			data-image-position={imagePosition}
		>
			<div className={styles.cardContent}>
				<div className={styles.artworkFrame} data-thumbnail-ratio={article.thumbnailRatio} aria-hidden="true">
					<div className={styles.artwork} />
				</div>
				<div className={styles.cardBody}>
					<div className={styles.profile}>
						{profile.type === 'bloger' ? (
							<UserAvatar
								className={styles.profileAvatar}
								src={profile.profileImageUrl}
								fallback={profile.name.slice(0, 1)}
								label={`${profile.name} 프로필`}
								size="sm"
							/>
						) : (
							<CologAvatar
								className={styles.profileAvatar}
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
							<span className={styles.cardTitleText}>{title}</span>
						</CustomLink>
					</h3>
					<MagazineArticleSummary text={summary} fitToThumbnail={isEnterprise} />
				</div>
			</div>
		</article>
	);
}
