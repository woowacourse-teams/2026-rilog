'use client';

import { useRef } from 'react';

import Button from '@/shared/ui/button/Button';
import Modal from '@/shared/ui/modal/Modal';

interface LoginModalProps {
	open: boolean;
	onClose: () => void;
	onGitHubLogin?: () => void;
	isPending?: boolean;
}

export default function LoginModal({ open, onClose, onGitHubLogin, isPending = false }: LoginModalProps) {
	const githubLoginButtonRef = useRef<HTMLButtonElement>(null);

	return (
		<Modal
			open={open}
			title="로그인"
			description={`GitHub 계정으로 간편하게 시작하세요.\n팀의 글을 읽고 함께 기록할 수 있습니다.`}
			onClose={onClose}
			size="sm"
			isPending={isPending}
			initialFocusRef={githubLoginButtonRef}
		>
			<Button
				ref={githubLoginButtonRef}
				variant="github"
				size="lg"
				fullWidth
				isPending={isPending}
				onClick={onGitHubLogin}
				className="mt-5"
			>
				<svg viewBox="0 0 24 24" aria-hidden="true" className="size-5 shrink-0" fill="currentColor">
					<path d="M12 2C6.48 2 2 6.59 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-1.05-.01-1.9-2.78.62-3.37-1.21-3.37-1.21-.45-1.19-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.85.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.31.1-2.72 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.88a9.3 9.3 0 0 1 2.5.35c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.46.1 2.72.64.72 1.03 1.64 1.03 2.76 0 3.94-2.34 4.8-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.59.69.49A10.26 10.26 0 0 0 22 12.25C22 6.59 17.52 2 12 2Z" />
				</svg>
				GitHub로 계속하기
			</Button>
		</Modal>
	);
}
