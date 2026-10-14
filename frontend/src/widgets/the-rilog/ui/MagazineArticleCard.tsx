import CologAvatar from '@/domains/blog/ui/CologAvatar';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import TheRilogArticleLink from '@/features/analytics/ui/TheRilogArticleLink';
import type { MagazineArticle } from '@/features/the-rilog/model/magazine';

import { formatEnterpriseArticleText } from '../lib/format-enterprise-article-text';

import MagazineArticleSummary from './MagazineArticleSummary';
import MagazineThumbnail from './MagazineThumbnail';
import styles from './the-rilog-magazine.module.css';

interface MagazineArticleCardProps {
	article: MagazineArticle;
	imagePosition?: 'left' | 'right';
	position: number;
}

export default function MagazineArticleCard({ article, position, imagePosition = 'left' }: MagazineArticleCardProps) {
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
						<TheRilogArticleLink
							href={article.href}
							postId={article.postId}
							contentType={isEnterprise ? 'enterprise' : 'personal'}
							position={position}
							className={styles.cardLink}
						>
							<span className={styles.cardTitleText}>{title}</span>
						</TheRilogArticleLink>
					</h3>
					<MagazineArticleSummary text={summary} fitToThumbnail={isEnterprise} />
				</div>
			</div>
		</article>
	);
}
