'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

import AlertModal from '@/shared/ui/modal/AlertModal';

type AccessFeedbackReason = 'auth-required' | 'forbidden';

interface AccessFeedbackProps {
	isOpen: boolean;
	reason: AccessFeedbackReason;
	redirectPath: string;
}

const ACCESS_FEEDBACK_CONTENT = {
	'auth-required': {
		title: '로그인이 필요한 페이지입니다.',
		description: '홈으로 이동합니다. 로그인 후 이용해 주세요.',
	},
	forbidden: {
		title: '접근 권한이 없는 페이지입니다.',
		description: '페이지를 이용할 권한이 있는지 확인해 주세요.',
	},
} as const;

export default function AccessFeedback({ isOpen, reason, redirectPath }: AccessFeedbackProps) {
	const router = useRouter();
	const handleClose = useCallback(() => {
		router.replace(redirectPath, { scroll: false });
	}, [redirectPath, router]);
	const content = ACCESS_FEEDBACK_CONTENT[reason];

	return (
		<AlertModal
			open={isOpen}
			title={content.title}
			description={content.description}
			onAction={() => undefined}
			onClose={handleClose}
		/>
	);
}
