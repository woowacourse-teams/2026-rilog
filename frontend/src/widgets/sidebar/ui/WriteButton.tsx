'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect } from 'react';

import { recordEditorEntryContext } from '@/features/analytics/lib/editor-entry-context';
import { useAuth } from '@/features/auth/model/use-auth';
import { savePendingAuthAction, takePendingAuthAction } from '@/features/login/lib/pending-auth-action';
import { useAuthAction } from '@/features/login/model/use-auth-action';
import { APP_ROUTES } from '@/shared/routes/app-routes';
import ButtonLink from '@/shared/ui/button/ButtonLink';
import WriteIcon from '@/widgets/sidebar/assets/write.svg';

import { EXPANDED_TEXT_CLASS_NAME, EXPANDING_ACTION_CLASS_NAME, SIDEBAR_GLYPH_CLASS_NAME } from './sidebar-class-names';

export default function WriteButton() {
	const router = useRouter();
	const { isAuthenticated, isInitialized } = useAuth();
	const navigate = useCallback(() => {
		recordEditorEntryContext('sidebar');
		router.push(APP_ROUTES.write);
	}, [router]);

	const handleWriteAction = useAuthAction({
		action: () => recordEditorEntryContext('sidebar'),
		beforeAuth: () => savePendingAuthAction({ write: true, pathname: window.location.pathname }),
		entrySurface: 'sidebar',
	});

	const handleWriteLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
		if (
			event.defaultPrevented ||
			event.button !== 0 ||
			event.metaKey ||
			event.ctrlKey ||
			event.shiftKey ||
			event.altKey
		) {
			return;
		}

		if (!isAuthenticated) event.preventDefault();
		handleWriteAction();
	};

	useEffect(() => {
		if (!isInitialized || !isAuthenticated) return;
		const value = takePendingAuthAction(
			(candidate) => typeof candidate === 'object' && candidate !== null && 'write' in candidate,
		);
		if (
			typeof value === 'object' &&
			value !== null &&
			'write' in value &&
			'pathname' in value &&
			value.write === true &&
			value.pathname === window.location.pathname
		) {
			navigate();
		}
	}, [isAuthenticated, isInitialized, navigate]);

	return (
		<ButtonLink
			href={APP_ROUTES.write}
			onClick={handleWriteLinkClick}
			fullWidth
			className={`rounded-lg! ${EXPANDING_ACTION_CLASS_NAME}`}
		>
			<span className="flex h-full w-11.25 shrink-0 items-center justify-center">
				<WriteIcon aria-hidden="true" focusable="false" className={SIDEBAR_GLYPH_CLASS_NAME} />
			</span>
			<span className={`absolute left-1/2 -translate-x-1/2 ${EXPANDED_TEXT_CLASS_NAME}`}>글쓰기</span>
		</ButtonLink>
	);
}
