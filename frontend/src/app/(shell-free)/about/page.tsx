import { Cormorant_Garamond } from 'next/font/google';
import Image from 'next/image';
import Link from 'next/link';

import type { Metadata } from 'next';

import { APP_ROUTES } from '@/shared/routes/app-routes';
import { createSocialMetadata, DEFAULT_OG_IMAGE, SITE_NAME } from '@/shared/seo/create-social-metadata';

import styles from './AboutPage.module.css';
import AboutViewportReveal from './AboutViewportReveal';
import HeroMeaningTransition from './HeroMeaningTransition';

const ABOUT_DESCRIPTION =
	'생각과 경험을 깊이 기록하고, 서로의 이야기를 발견하며 함께 성장하는 블로그 Rilog.을 소개합니다.';

const cormorantGaramond = Cormorant_Garamond({
	display: 'swap',
	fallback: ['Georgia', 'serif'],
	style: 'normal',
	subsets: ['latin'],
	variable: '--font-cormorant-garamond',
	weight: '400',
});

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

function ImagePlaceholder({ label, className = '' }: Readonly<{ label: string; className?: string }>) {
	return (
		<div
			className={`${styles.imagePlaceholder} ${className}`}
			role="img"
			aria-label={label}
			data-about-reveal="media"
		/>
	);
}

function ProductImage({ src, alt }: Readonly<{ src: string; alt: string }>) {
	return (
		<div className={styles.productImage} data-about-reveal="media">
			<Image src={src} alt={alt} fill sizes="(max-width: 47.99rem) 100vw, 75vw" />
		</div>
	);
}

function RoadmapImage({ src, alt }: Readonly<{ src: string; alt: string }>) {
	return (
		<div className={styles.roadmapImage} data-about-reveal="media">
			<Image src={src} alt={alt} fill sizes="(max-width: 47.99rem) 100vw, 66vw" />
		</div>
	);
}

export default function AboutPage() {
	return (
		<main className={`${styles.page} ${cormorantGaramond.variable}`}>
			<AboutViewportReveal />
			<HeroMeaningTransition />

			<section className={`${styles.manifestoSection} ${styles.manifestoOpening}`}>
				<h2 data-about-reveal="copy">
					Write
					<br />
					deeper<span>.</span>
				</h2>
				<p data-about-reveal="copy" data-about-reveal-delay="staggered">
					코드에서 점(.)을 통해 객체의 내부로 들어가듯,
					<br />
					Rilog.라는 공간 안에서 각자의 블로그는 하나의 객체가 됩니다.
					<br />
					<br />그 안에서 여러분 각자의 깊은 이야기를 들려주세요.
				</p>
			</section>

			<section className={`${styles.manifestoSection} ${styles.manifestoReverse}`}>
				<h2 data-about-reveal="copy">
					Grow
					<br />
					together<span>.</span>
				</h2>
				<p data-about-reveal="copy" data-about-reveal-delay="staggered">
					하나의 개인으로서 그리고 내가 속한 집단으로서 함께하세요.
					<br />
					<br />
					어느 형태로든 자신의 생각과 경험을 기록하고,
					<br />
					서로의 이야기를 발견하며 함께 성장하는 공간을 지향합니다.
					<br />
				</p>
			</section>

			<section className={styles.productSection} aria-label="현재 기능">
				<article className={styles.featureRow}>
					<div className={styles.featureCopy} data-about-reveal="copy">
						<h3>집중해서 쓰는 공간.</h3>
						<p>
							생각의 흐름을 방해하지 않는 에디터에서
							<br />
							깊이 있는 글을 완성합니다.
						</p>
					</div>
					<ProductImage src="/about/product-editor.png" alt="Rilog 에디터에서 글을 작성하는 화면" />
				</article>

				<article className={styles.featureRow}>
					<div className={styles.featureCopy} data-about-reveal="copy">
						<h3>
							나만의 기록이
							<br />
							쌓이는 곳.
						</h3>
						<p>
							여러분의 깊은 이야기를 작성하세요.
							<br />
							시리즈를 활용하면
							<br />
							유사한 글들을 모아 관리할 수 있습니다.
						</p>
					</div>
					<ProductImage src="/about/product-user-blog-home.png" alt="Rilog 개인 블로그 홈 화면" />
				</article>

				<article className={styles.featureRow}>
					<div className={styles.featureCopy} data-about-reveal="copy">
						<h3>
							함께 쓰며
							<br />
							넓어지는 생각.
						</h3>
						<p>
							팀과 스터디, 조직의 기록을
							<br />
							Colog에 모아 공동의 지식으로 발전시킵니다.
							<br />
							팀으로서 발행한 글도
							<br />내 프로필에서 한 번에 관리할 수 있습니다.
						</p>
					</div>
					<ProductImage src="/about/product-colog-blog-home.png" alt="Rilog Colog 홈 화면" />
				</article>
			</section>

			<section className={styles.intermission}>
				<h2 data-about-reveal="copy">
					Writing doesn&apos;t
					<br />
					end at publishing<span>.</span>
				</h2>
				<p data-about-reveal="copy" data-about-reveal-delay="staggered">
					기록을 발견하고, 나누고, 돌아보고, 자유롭게 옮길 수 있도록
					<br />
					Rilog.의 다음 장을 만들고 있습니다.
					<br />
					<br />
					글을 쓰고 발견하는 경험을 더 깊고 자유롭게 확장합니다.
				</p>
			</section>

			<section className={styles.roadmapSection} aria-label="업데이트 예정 기능">
				<div className={styles.roadmapTransition} aria-hidden="true" data-about-reveal="line" />

				<article className={styles.roadmapRow}>
					<div className={styles.roadmapCopy} data-about-reveal="copy">
						<h3>
							반응하고, 구독하고,
							<br />
							문장 위에서 대화하기.
						</h3>
						<p>
							Like로 관심을 표현하고 Colog를 구독합니다.
							<br />
							특정 문장에 직접 의견을 남기는 인라인 댓글로
							<br />더 구체적인 대화를 이어갑니다.
						</p>
					</div>
					<RoadmapImage src="/about/roadmap-inline-comment.png" alt="게시글의 특정 문장에 인라인 댓글이 달린 화면" />
				</article>

				<article className={`${styles.roadmapRow} ${styles.roadmapCompact}`}>
					<ImagePlaceholder label="게시글과 블로그 통합 검색 화면 이미지 자리" />
					<div className={styles.roadmapCopy} data-about-reveal="copy">
						<h3>
							필요한 기록을
							<br />
							빠르게 발견하기.
						</h3>
						<p>
							게시글과 블로그를 함께 검색하고
							<br />
							다양한 개발자와 팀의 콘텐츠를 탐색합니다.
						</p>
					</div>
				</article>

				<article className={`${styles.roadmapRow} ${styles.roadmapWide}`}>
					<div className={styles.roadmapCopy} data-about-reveal="copy">
						<h3>
							내 기록이 어떻게
							<br />
							읽히는지 이해하기.
						</h3>
						<p>
							조회수, 유입 경로, 인기 게시글 등<br />
							다양한 통계를 한눈에 확인합니다.
						</p>
					</div>
					<ImagePlaceholder label="게시글 통계 화면 이미지 자리" />
				</article>

				<article className={`${styles.roadmapRow} ${styles.roadmapInset}`}>
					<ImagePlaceholder label="RSS XML 파일 가져오기 화면 이미지 자리" />
					<div className={styles.roadmapCopy} data-about-reveal="copy">
						<h3>기존 기록을 가볍게 옮기기.</h3>
						<p>
							RSS를 활용해 기존 블로그 글을 가져오고
							<br />
							새로운 플랫폼으로 이동할 때의 부담을 줄입니다.
						</p>
					</div>
				</article>

				<article className={`${styles.roadmapRow} ${styles.roadmapLast}`}>
					<div className={styles.roadmapCopy} data-about-reveal="copy">
						<h3>어디서든 바로 발행하기.</h3>
						<p>
							게시글 발행 MCP를 통해 외부 도구에서도
							<br />
							Rilog.에 글을 바로 발행할 수 있습니다.
						</p>
					</div>
					<ImagePlaceholder label="외부 도구에서 Rilog에 게시글을 발행하는 흐름 이미지 자리" />
				</article>

				<article className={`${styles.roadmapRow} ${styles.roadmapTall}`}>
					<ImagePlaceholder label="다크 모드 메인 피드 이미지 자리" />
					<div className={styles.roadmapCopy} data-about-reveal="copy">
						<h3>더 편안한 읽기 환경.</h3>
						<p>
							사용 환경과 취향에 맞춰 화면 테마를 선택할 수 있도록
							<br />
							다크 모드를 지원합니다.
						</p>
					</div>
				</article>
			</section>

			<section className={styles.closingSection}>
				<h2 data-about-reveal="copy">
					Your next thought
					<br />
					could begin here<span>.</span>
				</h2>
				<div className={styles.closingActions} data-about-reveal="copy" data-about-reveal-delay="staggered">
					<Link href={APP_ROUTES.feeds}>
						<span>피드 둘러보기</span>
						<span aria-hidden="true">↗</span>
					</Link>
					<a href="mailto:contact@rilog.dev">
						<span>Rilog.에 이야기하기</span>
						<span aria-hidden="true">↗</span>
					</a>
				</div>
			</section>
		</main>
	);
}
