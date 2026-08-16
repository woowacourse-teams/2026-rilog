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
		<div className="relative flex h-128 flex-col items-center justify-center bg-brand-primary px-6 pt-[18px] text-center text-text-on-dark">
			<CologAvatar
				src={profile.logoImageUrl || undefined}
				fallback={profile.name.slice(0, 1)}
				label={`${profile.name} 코로그 로고`}
				size="max"
			/>

			<h1 className="mt-2.5 text-title-3 font-semibold">{profile.name}</h1>
			{hasIntroduction || hasServiceUrl ? (
				<p className="mt-2.5 text-caption-2 text-navy-200">
					{hasIntroduction ? profile.introduction : null}
					{hasIntroduction && hasServiceUrl ? <br /> : null}
					{hasServiceUrl ? (
						<a
							href={profile.serviceUrl}
							className="inline-flex items-center gap-1 rounded-sm underline-offset-4 hover:text-text-on-dark hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
						>
							<LinkIcon aria-hidden="true" focusable="false" className="size-4.5 shrink-0" />
							{getServiceUrlLabel(profile.serviceUrl)}
						</a>
					) : null}
				</p>
			) : null}

			{hasGitHubUrl || hasEmail ? (
				<div className="mt-2.5 flex items-center gap-3 text-navy-200">
					{hasGitHubUrl ? (
						<a
							href={profile.githubUrl}
							target="_blank"
							rel="noreferrer"
							aria-label={`${profile.name} GitHub`}
							className="flex size-7 items-center justify-center rounded-sm transition-colors hover:text-text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
						>
							<GitHubIcon aria-hidden="true" focusable="false" className="size-6 fill-current" />
						</a>
					) : null}
					{hasEmail ? (
						<a
							href={`mailto:${profile.email}`}
							aria-label={`${profile.name} 이메일`}
							className="flex size-7 items-center justify-center rounded-sm transition-colors hover:text-text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
						>
							<MailIcon aria-hidden="true" focusable="false" className="size-6" />
						</a>
					) : null}
				</div>
			) : null}

			<Button
				size="icon"
				aria-label={`${profile.name} 코로그 메뉴 열기`}
				className="absolute top-20 right-15 flex size-7 items-center justify-center rounded-md text-navy-200 transition-colors hover:text-text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
			>
				<MeatballIcon aria-hidden="true" focusable="false" className="size-6" />
			</Button>
		</div>
	);
}
