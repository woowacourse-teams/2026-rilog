import Image from 'next/image';

import { APP_ROUTES } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';

const LINK_CLASS_NAME =
	'rounded-sm transition-[color,opacity,transform] duration-200 hover:text-brand-primary-hover active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring motion-reduce:transform-none';

const ICON_LINK_CLASS_NAME = `${LINK_CLASS_NAME} group inline-flex size-11 items-center justify-center text-text-primary hover:-translate-y-0.5 hover:bg-surface-active active:translate-y-0 sm:size-8`;

const ICON_CLASS_NAME = 'transition-opacity duration-200 group-hover:opacity-70';

export default function Footer() {
	const currentYear = new Date().getFullYear();

	return (
		<footer className="bg-surface-hover text-text-primary">
			<div className="grid grid-cols-1 gap-y-3 px-5 py-6 sm:h-25 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:grid-rows-[auto_1fr_auto] sm:gap-x-20 sm:gap-y-1 sm:px-8 sm:py-3 md:gap-x-36 md:px-16">
				<div className="flex flex-col items-start gap-0.5 sm:col-start-1 sm:row-span-3 sm:self-start">
					<CustomLink
						className={`${LINK_CLASS_NAME} inline-flex min-h-11 items-center hover:opacity-75`}
						href={APP_ROUTES.feeds}
						aria-label="Rilog 홈"
					>
						<Image src="/brand/logo.svg" alt="Rilog." width={85} height={34} priority />
					</CustomLink>
					<p className="w-max text-caption-2 font-medium">기록을 작성하고 함께 나누는 공간</p>
				</div>

				<nav
					aria-label="정책"
					className="hidden flex-wrap items-center gap-x-5 text-caption-1 font-semibold sm:col-start-2 sm:row-start-1 sm:flex sm:flex-col sm:items-end sm:gap-x-0"
				>
					<a
						className={`${LINK_CLASS_NAME} inline-flex min-h-11 items-center underline-offset-4 hover:underline sm:min-h-0 sm:py-0.5`}
						href="https://receptive-sugar-20f.notion.site/Rilog-3c20af5ece568068a244ead52491639b?source=copy_link"
						target="_blank"
						rel="noopener noreferrer"
					>
						개인정보처리방침
					</a>
					<a
						className={`${LINK_CLASS_NAME} inline-flex min-h-11 items-center underline-offset-4 hover:underline sm:min-h-0 sm:py-0.5`}
						href="https://receptive-sugar-20f.notion.site/Rilog-3c20af5ece568021b809fedd5650c5dd?source=copy_link"
						target="_blank"
						rel="noopener noreferrer"
					>
						이용약관
					</a>
				</nav>

				<section
					aria-labelledby="footer-contact-heading"
					className="flex items-center justify-between border-t border-border-default pt-3 sm:col-start-3 sm:row-start-1 sm:block sm:border-t-0 sm:pt-0"
				>
					<h2 id="footer-contact-heading" className="text-label-1 font-semibold sm:text-right">
						contact
					</h2>
					<div className="flex items-center sm:mt-1 sm:justify-end">
						<a className={ICON_LINK_CLASS_NAME} href="mailto:contact@rilog.dev" aria-label="Rilog 이메일 문의">
							<Image className={ICON_CLASS_NAME} src="/icons/contact/email.svg" alt="" width={24} height={24} />
						</a>
						<a
							className={ICON_LINK_CLASS_NAME}
							href="https://open.kakao.com/o/s8RvBMJi"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Rilog 오픈채팅방"
						>
							<Image className={ICON_CLASS_NAME} src="/icons/contact/google-form.svg" alt="" width={24} height={24} />
						</a>
						<a
							className={ICON_LINK_CLASS_NAME}
							href="https://www.instagram.com/rilog_official/"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Rilog Instagram"
						>
							<Image className={ICON_CLASS_NAME} src="/icons/contact/instagram.svg" alt="" width={24} height={24} />
						</a>
						<a
							className={ICON_LINK_CLASS_NAME}
							href="https://www.threads.com/@rilog_official"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Rilog Threads"
						>
							<Image className={ICON_CLASS_NAME} src="/icons/contact/threads.svg" alt="" width={20} height={20} />
						</a>
					</div>
				</section>

				<p className="border-t border-border-default pt-4 text-center text-caption-1 font-medium text-text-secondary sm:col-span-2 sm:col-start-2 sm:row-start-3 sm:border-t-0 sm:pt-0 sm:text-right sm:text-text-primary">
					© {currentYear} Rilog. All rights reserved.
				</p>
			</div>
		</footer>
	);
}
