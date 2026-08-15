import Image, { type StaticImageData } from 'next/image';
import { useId } from 'react';

import type { RefObject } from 'react';

import type {
	CologProfileSettingsValue,
	CologProfileValidationErrors,
} from '@/features/colog-profile-management/model/colog-profile-settings';
import Input from '@/shared/ui/input/Input';

import linkIcon from '../../../../public/icons/colog-profile/link.svg';
import mailIcon from '../../../../public/icons/colog-profile/mail.svg';
import githubIcon from '../../../../public/icons/github.svg';

type CologProfileSocialField = 'serviceUrl' | 'githubUrl' | 'email';

interface CologProfileSocialFieldsProps {
	value: CologProfileSettingsValue;
	errors: CologProfileValidationErrors;
	serviceUrlRef: RefObject<HTMLInputElement | null>;
	githubUrlRef: RefObject<HTMLInputElement | null>;
	emailRef: RefObject<HTMLInputElement | null>;
	onChange: (field: CologProfileSocialField, value: string) => void;
}

export default function CologProfileSocialFields({
	value,
	errors,
	serviceUrlRef,
	githubUrlRef,
	emailRef,
	onChange,
}: CologProfileSocialFieldsProps) {
	const labelId = useId();
	const descriptionId = `${labelId}-description`;

	return (
		<div role="group" aria-labelledby={labelId} aria-describedby={descriptionId} className="flex flex-col gap-3">
			<div className="flex flex-col gap-1">
				<p id={labelId} className="text-body-2 font-semibold text-text-primary">
					소셜 (선택)
				</p>
				<p id={descriptionId} className="text-label-2 text-text-secondary">
					링크를 통해 팀을 표현해 보세요.
				</p>
			</div>
			<div className="flex flex-col gap-4">
				<Input
					ref={serviceUrlRef}
					id="serviceUrl"
					aria-label="서비스 링크"
					aria-describedby={descriptionId}
					name="serviceUrl"
					type="url"
					value={value.serviceUrl}
					maxLength={512}
					placeholder="https://"
					autoComplete="url"
					status={errors.serviceUrl === undefined ? 'default' : 'error'}
					helperText={errors.serviceUrl}
					left={
						<Image
							src={linkIcon as StaticImageData}
							alt=""
							width={18}
							height={18}
							aria-hidden="true"
							className="size-4.5 shrink-0"
						/>
					}
					onChange={(event) => onChange('serviceUrl', event.currentTarget.value)}
				/>
				<Input
					ref={githubUrlRef}
					id="githubUrl"
					aria-label="GitHub 링크"
					aria-describedby={descriptionId}
					name="githubUrl"
					type="url"
					value={value.githubUrl}
					maxLength={512}
					placeholder="https://"
					autoComplete="url"
					status={errors.githubUrl === undefined ? 'default' : 'error'}
					helperText={errors.githubUrl}
					left={
						<Image
							src={githubIcon as StaticImageData}
							alt=""
							width={18}
							height={18}
							aria-hidden="true"
							className="size-4.5 shrink-0"
						/>
					}
					onChange={(event) => onChange('githubUrl', event.currentTarget.value)}
				/>
				<Input
					ref={emailRef}
					id="email"
					aria-label="이메일"
					aria-describedby={descriptionId}
					name="email"
					type="email"
					value={value.email}
					maxLength={512}
					placeholder="team@rilog.kr"
					autoComplete="email"
					status={errors.email === undefined ? 'default' : 'error'}
					helperText={errors.email}
					left={
						<Image
							src={mailIcon as StaticImageData}
							alt=""
							width={18}
							height={18}
							aria-hidden="true"
							className="size-4.5 shrink-0"
						/>
					}
					onChange={(event) => onChange('email', event.currentTarget.value)}
				/>
			</div>
		</div>
	);
}
