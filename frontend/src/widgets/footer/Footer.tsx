import Image from 'next/image';
import Link from 'next/link';

const LINK_CLASS_NAME =
	'rounded-sm transition-[color,opacity,transform] duration-200 hover:text-brand-primary-hover active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring motion-reduce:transform-none';

const ICON_LINK_CLASS_NAME = `${LINK_CLASS_NAME} group inline-flex size-11 items-center justify-center text-text-primary hover:-translate-y-0.5 hover:bg-surface-active active:translate-y-0 md:size-8`;

const ICON_CLASS_NAME = 'transition-opacity duration-200 group-hover:opacity-70';

export default function Footer() {
	const currentYear = new Date().getFullYear();

	return (
		<footer className="bg-surface-hover text-text-primary">
			<div className="grid grid-cols-1 gap-8 px-6 py-6 md:h-25 md:grid-cols-[minmax(0,1fr)_auto_auto] md:grid-rows-[auto_1fr_auto] md:gap-x-36 md:gap-y-1 md:px-16 md:py-3">
				<div className="flex flex-col items-start gap-0.5 md:col-start-1 md:row-span-3 md:self-start">
					<Link
						className={`${LINK_CLASS_NAME} inline-flex min-h-11 items-center hover:opacity-75`}
						href="/"
						aria-label="Rilog 홈"
					>
						<Image src="/brand/logo.svg" alt="Rilog." width={85} height={32} priority />
					</Link>
					<p className="text-caption-2 font-medium">기록을 작성하고 함께 나누는 공간</p>
				</div>

				<nav
					aria-label="정책"
					className="flex flex-col items-start text-caption-1 font-semibold md:col-start-2 md:row-start-1 md:items-end"
				>
					<Link
						className={`${LINK_CLASS_NAME} inline-flex min-h-11 items-center underline-offset-4 hover:underline md:min-h-0 md:py-0.5`}
						href="/privacy"
					>
						개인정보처리방침
					</Link>
					<Link
						className={`${LINK_CLASS_NAME} inline-flex min-h-11 items-center underline-offset-4 hover:underline md:min-h-0 md:py-0.5`}
						href="/terms"
					>
						이용약관
					</Link>
				</nav>

				<section aria-labelledby="footer-contact-heading" className="md:col-start-3 md:row-start-1">
					<h2 id="footer-contact-heading" className="text-label-1 font-semibold md:text-right">
						contact
					</h2>
					<div className="mt-1 flex items-center md:justify-end">
						<a className={ICON_LINK_CLASS_NAME} href="mailto:contact@rilog.dev" aria-label="Rilog 이메일 문의">
							<Image className={ICON_CLASS_NAME} src="/icons/contact/email.svg" alt="" width={24} height={24} />
						</a>
						<a
							className={ICON_LINK_CLASS_NAME}
							href="https://docs.google.com/forms/"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Rilog Google Form 문의"
						>
							<Image className={ICON_CLASS_NAME} src="/icons/contact/google-form.svg" alt="" width={24} height={24} />
						</a>
						<a
							className={ICON_LINK_CLASS_NAME}
							href="https://www.instagram.com/"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Rilog Instagram"
						>
							<Image className={ICON_CLASS_NAME} src="/icons/contact/instagram.svg" alt="" width={24} height={24} />
						</a>
						<a
							className={ICON_LINK_CLASS_NAME}
							href="https://www.threads.net/"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Rilog Threads"
						>
							<Image className={ICON_CLASS_NAME} src="/icons/contact/threads.svg" alt="" width={20} height={20} />
						</a>
					</div>
				</section>

				<p className="text-caption-1 font-medium md:col-span-2 md:col-start-2 md:row-start-3 md:text-right">
					© {currentYear} Rilog. All rights reserved.
				</p>
			</div>
		</footer>
	);
}
