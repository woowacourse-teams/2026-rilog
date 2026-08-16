'use client';

import { useRef } from 'react';

import GitHubIcon from '@/shared/assets/brand/github.svg';
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
				<GitHubIcon aria-hidden="true" focusable="false" className="size-5 shrink-0 brightness-0 invert" />
				GitHub로 계속하기
			</Button>
		</Modal>
	);
}
