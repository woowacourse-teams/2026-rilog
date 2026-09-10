import Image from 'next/image';

import { APP_ROUTES } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';

const LINK_CLASS_NAME =
	'rounded-sm transition-[color,opacity,transform] duration-200 hover:text-brand-primary-hover active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring motion-reduce:transform-none';

const ICON_LINK_CLASS_NAME = `${LINK_CLASS_NAME} group inline-flex size-11 items-center justify-center text-text-primary hover:bg-surface-active active:translate-y-0 sm:size-8`;

const ICON_CLASS_NAME = 'transition-opacity duration-200 group-hover:opacity-70';

export default function Footer() {
	const currentYear = new Date().getFullYear();

	return (
		<footer className="bg-background text-text-primary">
			<div className="flex flex-col items-center px-5 py-6 text-center sm:pt-4 sm:pb-11">
				<p className="text-caption-1 font-medium">© {currentYear} Rilog. All rights reserved.</p>

				<section aria-label="연락 및 SNS" className="mt-1 sm:mt-2">
					<div className="flex items-center">
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

				<nav aria-label="정책" className="mt-1 flex items-center gap-1 text-caption-1 font-semibold">
					<CustomLink
						className={`${LINK_CLASS_NAME} inline-flex min-h-11 items-center underline-offset-4 hover:underline sm:min-h-8`}
						href="/about"
					>
						Rilog. 이야기
					</CustomLink>
					<span aria-hidden="true">·</span>
					<a
						className={`${LINK_CLASS_NAME} inline-flex min-h-11 items-center underline-offset-4 hover:underline sm:min-h-8`}
						href="https://receptive-sugar-20f.notion.site/Rilog-3c20af5ece568068a244ead52491639b?source=copy_link"
						target="_blank"
						rel="noopener noreferrer"
					>
						개인정보처리방침
					</a>
					<span aria-hidden="true">·</span>
					<a
						className={`${LINK_CLASS_NAME} inline-flex min-h-11 items-center underline-offset-4 hover:underline sm:min-h-8`}
						href="https://receptive-sugar-20f.notion.site/Rilog-3c20af5ece568021b809fedd5650c5dd?source=copy_link"
						target="_blank"
						rel="noopener noreferrer"
					>
						이용약관
					</a>
				</nav>

				<CustomLink
					className={`${LINK_CLASS_NAME} mt-5 inline-flex hover:opacity-75 sm:mt-6`}
					href={APP_ROUTES.feeds}
					aria-label="Rilog 홈"
				>
					<Image className="h-auto w-[184px]" src="/brand/logo.svg" alt="Rilog." width={1186} height={472} priority />
				</CustomLink>
			</div>
		</footer>
	);
}
