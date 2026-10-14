import CologAvatar from '@/domains/blog/ui/CologAvatar';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import type { MagazineArticle } from '@/features/the-rilog/model/magazine';
import CustomLink from '@/shared/ui/link/CustomLink';

import { formatEnterpriseArticleText } from '../lib/format-enterprise-article-text';

import MagazineArticleSummary from './MagazineArticleSummary';
import MagazineThumbnail from './MagazineThumbnail';
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
				<MagazineThumbnail key={article.thumbnailImageUrl} src={article.thumbnailImageUrl} />
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
						<CustomLink href={article.href} className={styles.cardLink}>
							<span className={styles.cardTitleText}>{title}</span>
						</CustomLink>
					</h3>
					<MagazineArticleSummary text={summary} fitToThumbnail={isEnterprise} />
				</div>
			</div>
		</article>
	);
}
