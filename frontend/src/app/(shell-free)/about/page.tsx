import Link from 'next/link';

import type { Metadata } from 'next';

import { APP_ROUTES } from '@/shared/routes/app-routes';
import { createSocialMetadata, DEFAULT_OG_IMAGE, SITE_NAME } from '@/shared/seo/create-social-metadata';

import styles from './AboutPage.module.css';
import AboutViewportReveal from './AboutViewportReveal';
import HeroMeaningTransition from './HeroMeaningTransition';

const ABOUT_DESCRIPTION =
	'생각과 경험을 깊이 기록하고, 서로의 이야기를 발견하며 함께 성장하는 블로그 Rilog.을 소개합니다.';

export const metadata: Metadata = {
	alternates: { canonical: APP_ROUTES.about },
	description: ABOUT_DESCRIPTION,
	title: 'About',
	...createSocialMetadata({
		description: ABOUT_DESCRIPTION,
		image: DEFAULT_OG_IMAGE,
		title: `About | ${SITE_NAME}`,
		type: 'website',
		url: APP_ROUTES.about,
	}),
};

export default function AboutPage() {
	return (
		<main className={styles.page}>
			<AboutViewportReveal />
			<HeroMeaningTransition />

			<section className={`${styles.manifestoSection} ${styles.manifestoOpening}`}>
				<h2 data-about-reveal="copy">
					write
					<br />
					deeper<span>.</span>
				</h2>
			</section>

			<section className={`${styles.manifestoSection} ${styles.manifestoReverse}`}>
				<h2 data-about-reveal="copy">
					grow
					<br />
					together<span>.</span>
				</h2>
			</section>

			<div className={styles.manifestoSeparator} aria-hidden="true">
				<span />
				<span />
				<span />
			</div>

			<section className={styles.manifestoMeaningSection} aria-label="Rilog의 의미">
				<div className={styles.manifestoMeaningBody} data-about-reveal="copy">
					<p>
						Rilog.의 점(.)은 한 단계 더 깊이 들어가는 시작점입니다. 코드에서 점을 통해 객체의 내부에 접근하듯,
						이곳에서는 각자의 블로그를 통해 한 사람의 생각과 경험, 한 팀의 이야기를 깊이 들여다봅니다.
					</p>
					<p>
						인터넷에는 수많은 정보와 이야기가 빠르게 흘러갑니다. 그 안에서 Rilog.는 조금 더 천천히 읽고, 깊이 생각하고,
						오래 남길 수 있는 공간을 만들고자 합니다. 단순하고 편안한 글쓰기 경험을 제공하면서도, 각자의 이야기가 그것을
						필요로 하는 사람에게 닿을 수 있도록 돕습니다. 한 사람으로서 또는 내가 속한 팀의 구성원으로서 뭐든
						상관없습니다.
					</p>
					<blockquote>
						<p>
							우리는 한 사람의 깊이 있는 기록이 누군가의 다음 걸음이 되고, 함께한 경험이 모두의 배움으로 남는다고
							믿습니다.
						</p>
					</blockquote>
					<p>Rilog. 에서 여러분의 이야기를 계속 이어가세요.</p>
				</div>
			</section>

			<section className={styles.linkSection} aria-label="Rilog 둘러보기와 문의하기">
				<Link href={APP_ROUTES.feeds}>
					<span>피드 둘러보기</span>
					<span aria-hidden="true">↗</span>
				</Link>
				<a href="mailto:contact@rilog.dev">
					<span>Rilog.에 이야기하기</span>
					<span aria-hidden="true">↗</span>
				</a>
			</section>
		</main>
	);
}
