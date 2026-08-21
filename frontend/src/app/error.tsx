'use client';

import { useEffect } from 'react';

import Button from '@/shared/ui/button/Button';
import ButtonLink from '@/shared/ui/button/ButtonLink';

interface ErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorProps) {
	useEffect(() => {
		console.error('Unhandled error:', error);
	}, [error]);

	return (
		<div className="flex min-h-dvh flex-col items-center justify-center gap-6 text-center">
			<div className="space-y-4">
				<h1 className="text-4xl font-bold text-text-primary">오류가 발생했습니다</h1>
				<p className="text-sm whitespace-pre-line text-text-secondary">
					{`예상치 못한 오류가 발생했습니다.\n불편을 드려 죄송합니다. 잠시 후 다시 시도해 주세요.`}
				</p>
			</div>
			<div className="flex flex-wrap items-center justify-center gap-3">
				<Button onClick={() => reset()} variant="secondary" size="lg">
					다시 시도
				</Button>
				<ButtonLink href="/" variant="primary" size="lg">
					홈으로 돌아가기
				</ButtonLink>
			</div>
		</div>
	);
}
