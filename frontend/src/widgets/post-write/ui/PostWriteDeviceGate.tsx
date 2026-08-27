'use client';

import { lazy, Suspense, useEffect, useRef } from 'react';

import { analytics } from '@/features/analytics/model/events';
import { useMobileDevice } from '@/shared/hooks/use-mobile-device';
import { APP_ROUTES } from '@/shared/routes/app-routes';
import ButtonLink from '@/shared/ui/button/ButtonLink';

const POST_WRITE_LOADER = lazy(() => import('./PostWriteLoader'));

const statusClassName = 'flex min-h-dvh items-center justify-center bg-background px-6 text-center text-text-primary';

function WriteEnvironmentPending() {
	return (
		<main className={statusClassName}>
			<p className="text-body-2 text-text-secondary" role="status">
				글쓰기 환경을 확인하고 있어요.
			</p>
		</main>
	);
}

export default function PostWriteDeviceGate() {
	const { isMobileDevice, isResolved } = useMobileDevice();
	const hasTrackedUnavailableRef = useRef(false);

	useEffect(() => {
		if (isMobileDevice && !hasTrackedUnavailableRef.current) {
			analytics.postEditorUnavailableViewed();
			hasTrackedUnavailableRef.current = true;
		}
	}, [isMobileDevice]);

	if (!isResolved) {
		return <WriteEnvironmentPending />;
	}

	if (isMobileDevice) {
		return (
			<main className={statusClassName}>
				<div className="flex flex-col items-center">
					<h1 className="text-title-2 font-semibold">글 작성은 PC에서 이용해 주세요</h1>
					<p className="mt-3 text-body-2 text-text-secondary">안정적인 글 작성을 위해 PC 환경을 이용해 주세요.</p>
					<ButtonLink href={APP_ROUTES.feeds} className="mt-7">
						피드로 돌아가기
					</ButtonLink>
				</div>
			</main>
		);
	}

	return (
		<Suspense fallback={<WriteEnvironmentPending />}>
			<POST_WRITE_LOADER />
		</Suspense>
	);
}
