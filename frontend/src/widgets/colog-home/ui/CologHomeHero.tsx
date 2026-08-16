import type { CologProfile } from '@/domains/colog/model/colog-info';
import CologAvatar from '@/domains/colog/ui/CologAvatar';
import GitHubIcon from '@/shared/assets/brand/github.svg';
import LinkIcon from '@/shared/assets/icons/link.svg';
import MailIcon from '@/shared/assets/icons/mail.svg';
import MeatballIcon from '@/shared/assets/icons/meatball.svg';
import Button from '@/shared/ui/button/Button';
import { getServiceUrlLabel } from '@/widgets/colog-home/lib/getServiceUrlLabel';

interface CologHomeHeroProps {
	profile: CologProfile;
}

export default function CologHomeHero({ profile }: CologHomeHeroProps) {
	const hasIntroduction = profile.introduction.trim() !== '';
	const hasServiceUrl = profile.serviceUrl.trim() !== '';
	const hasGitHubUrl = profile.githubUrl.trim() !== '';
	const hasEmail = profile.email.trim() !== '';

	return (
		<div className="relative flex min-h-96 flex-col items-center justify-center bg-brand-primary px-5 py-12 text-center text-text-on-dark sm:min-h-112 sm:px-6 sm:py-14 md:min-h-128 md:py-16">
			<CologAvatar
				src={profile.logoImageUrl || undefined}
				fallback={profile.name.slice(0, 1)}
				label={`${profile.name} 코로그 로고`}
				size="max"
				className="size-32! sm:size-40! md:size-45!"
			/>

			<h1 className="mt-2.5 max-w-full text-title-2 font-semibold break-words sm:text-title-3">{profile.name}</h1>
			{hasIntroduction || hasServiceUrl ? (
				<p className="mt-2 max-w-full text-label-2 text-navy-200 sm:mt-2.5 sm:text-body-1">
					{hasIntroduction ? profile.introduction : null}
					{hasIntroduction && hasServiceUrl ? <br /> : null}
					{hasServiceUrl ? (
						<a
							href={profile.serviceUrl}
							className="inline-flex max-w-full items-center gap-1 rounded-sm underline-offset-4 hover:text-text-on-dark hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
						>
							<LinkIcon aria-hidden="true" focusable="false" className="size-4 shrink-0 sm:size-4.5" />
							<span className="truncate">{getServiceUrlLabel(profile.serviceUrl)}</span>
						</a>
					) : null}
				</p>
			) : null}

			{hasGitHubUrl || hasEmail ? (
				<div className="mt-2 flex items-center gap-0.5 text-navy-200 sm:mt-2.5 sm:gap-1">
					{hasGitHubUrl ? (
						<a
							href={profile.githubUrl}
							target="_blank"
							rel="noreferrer"
							aria-label={`${profile.name} GitHub`}
							className="flex size-8 items-center justify-center rounded-sm transition-colors hover:text-text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:size-9"
						>
							<GitHubIcon aria-hidden="true" focusable="false" className="size-5 fill-current sm:size-6" />
						</a>
					) : null}
					{hasEmail ? (
						<a
							href={`mailto:${profile.email}`}
							aria-label={`${profile.name} 이메일`}
							className="flex size-8 items-center justify-center rounded-sm transition-colors hover:text-text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:size-9"
						>
							<MailIcon aria-hidden="true" focusable="false" className="size-5 sm:size-6" />
						</a>
					) : null}
				</div>
			) : null}

			<Button
				size="icon"
				aria-label={`${profile.name} 코로그 메뉴 열기`}
				className="absolute top-5 right-5 bg-transparent sm:top-8 md:top-20 md:right-15"
			>
				<MeatballIcon aria-hidden="true" focusable="false" className="size-6" />
			</Button>
		</div>
	);
}
