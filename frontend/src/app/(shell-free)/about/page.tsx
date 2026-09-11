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
				<p data-about-reveal="copy" data-about-reveal-delay="staggered">
					Rilog.는 깊이 있는 생각이 머물 수 있는 차분하고 정제된 공간을 지향합니다. 신중하게 고른 문장, 충분히 돌아본
					경험, 자신만의 관점이 담긴 이야기가 그에 걸맞은 존중을 받기를 바랍니다.
					<br />
					우리는 읽고 쓰는 데 들인 시간의 가치를 믿습니다. 한 편의 글을 천천히 읽으며 타인의 선택을 이해하고, 익숙했던
					생각을 새롭게 바라보는 경험을 소중히 여깁니다. 깊이 탐구한 기술 이야기부터 일과 삶을 돌아보는 솔직한 기록까지,
					서로의 이야기에 귀 기울이며 생각을 나누는 문화를 만들어갑니다.
				</p>
				<p data-about-reveal="copy" data-about-reveal-delay="staggered">
					자극적이고 피상적인 이야기가 주목받기 쉬운 세상에서, 우리는 깊이와 섬세함, 그리고 충분한 시간을 들여 읽을
					가치가 있는 콘텐츠가 보상받는 시스템을 만들고 있습니다. 순간적인 반응을 주고받는 공간보다는 깊이 생각하며
					대화할 수 있는 공간을 만들고자 합니다.
				</p>
			</section>

			<section className={`${styles.manifestoSection} ${styles.manifestoReverse}`}>
				<h2 data-about-reveal="copy">
					grow
					<br />
					together<span>.</span>
				</h2>
				<div className={styles.manifestoReverseBody} data-about-reveal="copy" data-about-reveal-delay="staggered">
					<div>
						<p>
							Colog는 Cooperation과 Blog를 결합한 합성어로 팀 단위의 블로그를 의미합니다. 프로젝트를 이끌어온 깊은
							고민부터 함께 웃었던 소소한 순간까지, 각자의 시선으로 함께한 시간을 기록합니다. 그렇게 쌓인 글에는 한 팀의
							지식과 문화, 그리고 그 안에서 성장한 사람들의 이야기가 담깁니다.
						</p>
					</div>
					<div>
						<p>
							우리는 함께한 경험이 오래도록 이어지는 배움이 되기를 바랍니다. 동료의 질문이 새로운 생각의 출발점이 되고,
							지난 시행착오가 다음 도전의 밑거름이 되는 공간을 만들고자 합니다. 서로의 성취에 공감하고 고민을 함께
							들여다보며, 각자의 성장이 모두의 가능성을 넓혀가는 문화를 지향합니다.
						</p>
					</div>
				</div>
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
