'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import { APP_ROUTES } from '@/shared/routes/app-routes';
import AlertModal from '@/shared/ui/modal/AlertModal';

interface AuthRequiredFeedbackProps {
	isOpen: boolean;
}

export default function AuthRequiredFeedback({ isOpen }: AuthRequiredFeedbackProps) {
	const router = useRouter();
	const clearNotice = useCallback(() => {
		router.replace(APP_ROUTES.feeds, { scroll: false });
	}, [router]);

	return (
		<AlertModal
			open={isOpen}
			title="로그인이 필요한 페이지입니다."
			description="로그인 후 다시 이용해 주세요."
			onAction={() => undefined}
			onClose={clearNotice}
		/>
	);
}
