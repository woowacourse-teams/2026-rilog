import Image from 'next/image';

import type { MagazineDate } from '../lib/format-magazine-date';

import { APP_ROUTES } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';

import styles from './the-rilog-magazine.module.css';

interface MagazineMastheadProps {
	editionDate: MagazineDate;
}

export default function MagazineMasthead({ editionDate }: MagazineMastheadProps) {
	return (
		<header>
			<div className={styles.masthead}>
				<div className={styles.edition} aria-label="발행 정보">
					<time dateTime={editionDate.dateTime}>{editionDate.label}</time>
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
	);
}
