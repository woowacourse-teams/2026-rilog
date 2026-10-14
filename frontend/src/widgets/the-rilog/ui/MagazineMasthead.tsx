import Image from 'next/image';

import styles from './the-rilog-magazine.module.css';
import TodayDate from './TodayDate';

export default function MagazineMasthead() {
	return (
		<header>
			<div className={styles.masthead}>
				<TodayDate />
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
