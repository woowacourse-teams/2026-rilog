import type { ReactNode } from 'react';

import type { BlogPublicProfile } from '@/domains/blog/model/blog';
import CologAvatar from '@/domains/blog/ui/CologAvatar';
import GitHubIcon from '@/shared/assets/brand/github.svg';
import LinkIcon from '@/shared/assets/icons/link.svg';
import { getImageUrl } from '@/shared/utils/get-image-url';

import { getServiceUrlLabel } from '../lib/get-service-url-label';

import BlogProfileCoverImage from './BlogProfileCoverImage';

interface BlogProfileHeroProps {
	action?: ReactNode;
	profile: BlogPublicProfile;
}

export default function BlogProfileHero({ action, profile }: BlogProfileHeroProps) {
	const serviceUrl = profile.serviceUrl?.trim() ?? '';
	const githubUrl = profile.githubUrl?.trim() ?? '';
	const coverImageUrl = getImageUrl(profile.coverImageUrl);
	const hasCoverImage = coverImageUrl !== '';
	const heroBackgroundClassName = hasCoverImage
		? 'bg-brand-primary text-text-on-dark'
		: 'bg-[#DBE5F5] text-text-primary';
	const coverTextShadowClassName = hasCoverImage ? 'drop-shadow-[0_1px_2px_rgb(3_16_42_/_0.72)]' : '';
	const actionToneClassName = hasCoverImage ? `text-text-on-dark ${coverTextShadowClassName}` : 'text-text-secondary';
	const secondaryTextClassName = hasCoverImage ? 'text-navy-200' : 'text-text-secondary';
	const hasDescription = (profile.description?.trim() ?? '') !== '';
	const hasServiceUrl = serviceUrl !== '';
	const hasGitHubUrl = githubUrl !== '';
	const avatarLabel = profile.type === 'COLOG' ? `${profile.name} 코로그 로고` : `${profile.name} 개인 블로그 프로필`;

	return (
		<div
			className={`relative flex min-h-96 flex-col items-center justify-center overflow-hidden px-5 py-12 text-center sm:min-h-112 sm:px-6 sm:py-14 md:min-h-128 md:py-16 ${heroBackgroundClassName}`}
		>
			{hasCoverImage && <BlogProfileCoverImage src={coverImageUrl} alt={`${profile.name} 커버 이미지`} />}
			<div className="relative flex flex-col items-center">
				<CologAvatar
					src={profile.profileImageUrl || undefined}
					fallback={profile.name.slice(0, 1)}
					label={avatarLabel}
					size="max"
					className="size-32! sm:size-40! md:size-45!"
				/>

				<div className="relative mt-2.5 inline-block max-w-full">
					<h1
						className={`max-w-full min-w-0 pr-7 text-title-2 font-semibold wrap-break-word sm:text-title-3 ${coverTextShadowClassName}`}
					>
						{profile.name}
					</h1>
					{action ? <div className={`absolute top-0 right-0 ${actionToneClassName}`}>{action}</div> : null}
				</div>
				{hasDescription || hasServiceUrl ? (
					<p
						className={`mt-2 max-w-sm text-label-2 sm:mt-2.5 sm:max-w-lg sm:text-body-1 ${secondaryTextClassName} ${coverTextShadowClassName}`}
					>
						{hasDescription ? profile.description : null}
						{hasDescription && hasServiceUrl ? <br /> : null}
						{hasServiceUrl ? (
							<a
								href={serviceUrl}
								className="inline-flex max-w-full items-center gap-1 rounded-sm underline-offset-4 hover:text-text-on-dark hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
							>
								<LinkIcon aria-hidden="true" focusable="false" className="size-4 shrink-0 sm:size-4.5" />
								<span className="truncate">{getServiceUrlLabel(serviceUrl)}</span>
							</a>
						) : null}
					</p>
				) : null}

				{hasGitHubUrl ? (
					<div
						className={`mt-2 flex items-center gap-0.5 sm:mt-2.5 sm:gap-1 ${secondaryTextClassName} ${coverTextShadowClassName}`}
					>
						<a
							href={githubUrl}
							target="_blank"
							rel="noreferrer"
							aria-label={`${profile.name} GitHub`}
							className="flex size-8 items-center justify-center rounded-sm transition-colors hover:text-text-on-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring sm:size-9"
						>
							<GitHubIcon aria-hidden="true" focusable="false" className="size-5 fill-current sm:size-6" />
						</a>
					</div>
				) : null}
			</div>
		</div>
	);
}
