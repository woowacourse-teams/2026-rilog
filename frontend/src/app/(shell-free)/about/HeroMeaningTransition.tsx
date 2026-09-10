'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

import ChevronIcon from '@/shared/assets/icons/chevron.svg';

import styles from './AboutPage.module.css';

const clampProgress = (value: number) => Math.min(Math.max(value, 0), 1);

const getRangeProgress = (progress: number, start: number, end: number) =>
	clampProgress((progress - start) / (end - start));

const smoothProgress = (progress: number) => progress * progress * (3 - 2 * progress);

export default function HeroMeaningTransition() {
	const sequenceRef = useRef<HTMLDivElement>(null);
	const lockupRef = useRef<HTMLHeadingElement>(null);
	const continuationRef = useRef<HTMLSpanElement>(null);
	const continuationTextRef = useRef<HTMLSpanElement>(null);
	const meaningRef = useRef<HTMLParagraphElement>(null);
	const scrollCueRef = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		const sequence = sequenceRef.current;
		const lockup = lockupRef.current;
		const continuation = continuationRef.current;
		const continuationText = continuationTextRef.current;
		const meaning = meaningRef.current;
		const scrollCue = scrollCueRef.current;

		if (!sequence || !lockup || !continuation || !continuationText || !meaning || !scrollCue) {
			return;
		}

		const shouldReduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		if (shouldReduceMotion) {
			continuation.style.width = 'auto';
			continuation.style.opacity = '1';
			meaning.style.opacity = '1';
			meaning.style.transform = 'translate3d(-50%, 0, 0)';
			return;
		}

		let animationFrame = 0;
		let continuationWidth = continuationText.scrollWidth;
		let targetHorizontalShift = 0;

		const measure = () => {
			continuationWidth = continuationText.scrollWidth;
			const logo = lockup.querySelector('img');
			const logoWidth = logo?.offsetWidth ?? 0;
			targetHorizontalShift = Math.max(
				0,
				lockup.offsetLeft + logoWidth + continuationWidth / 2 - window.innerWidth / 2,
			);
		};

		const render = () => {
			animationFrame = 0;
			const scrollDistance = sequence.offsetHeight - window.innerHeight;
			const progress = scrollDistance > 0 ? clampProgress(-sequence.getBoundingClientRect().top / scrollDistance) : 1;
			const continuationProgress = smoothProgress(getRangeProgress(progress, 0.1, 0.62));
			const meaningProgress = smoothProgress(getRangeProgress(progress, 0.6, 0.76));
			const scrollCueProgress = smoothProgress(getRangeProgress(progress, 0, 0.12));

			lockup.style.transform = `translate3d(${-targetHorizontalShift * continuationProgress}px, 0, 0)`;
			continuation.style.width = `${continuationWidth * continuationProgress}px`;
			continuation.style.opacity = String(getRangeProgress(progress, 0.08, 0.18));
			meaning.style.opacity = String(meaningProgress);
			meaning.style.transform = `translate3d(-50%, ${32 * (1 - meaningProgress)}px, 0)`;
			scrollCue.style.opacity = String(1 - scrollCueProgress);
		};

		const requestRender = () => {
			if (animationFrame !== 0) {
				return;
			}

			animationFrame = window.requestAnimationFrame(render);
		};

		const handleResize = () => {
			measure();
			requestRender();
		};

		measure();
		render();
		window.addEventListener('scroll', requestRender, { passive: true });
		window.addEventListener('resize', handleResize);

		return () => {
			window.removeEventListener('scroll', requestRender);
			window.removeEventListener('resize', handleResize);
			window.cancelAnimationFrame(animationFrame);
		};
	}, []);

	return (
		<div ref={sequenceRef} className={styles.heroMeaningSequence}>
			<section id="about" className={styles.hero}>
				<h1 ref={lockupRef} className={styles.heroIconHeading}>
					<Image src="/brand/logo.svg" alt="Rilog." width={1186} height={472} priority />
					<span ref={continuationRef} className={styles.continuationClip} aria-hidden="true">
						<span ref={continuationTextRef} className={styles.continuationText}>
							continue()
						</span>
					</span>
				</h1>
				<p ref={meaningRef} className={styles.heroMeaningCopy}>
					점은 끝이 아니라, 한 단계 더 깊이 들어가는 시작점입니다.
				</p>
			</section>
			<span ref={scrollCueRef} className={styles.scrollCue} aria-hidden="true">
				<ChevronIcon aria-hidden="true" focusable="false" />
			</span>
			<span id="meaning" className={styles.meaningAnchor} aria-hidden="true" />
		</div>
	);
}
