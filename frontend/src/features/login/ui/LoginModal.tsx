'use client';

import Image, { type StaticImageData } from 'next/image';
import { useRef } from 'react';

import Button from '@/shared/ui/button/Button';
import Modal from '@/shared/ui/modal/Modal';

import githubIcon from '../../../../public/icons/github.svg';

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
				<Image
					src={githubIcon as StaticImageData}
					alt=""
					width={20}
					height={20}
					aria-hidden="true"
					className="size-5 shrink-0 brightness-0 invert"
				/>
				GitHub로 계속하기
			</Button>
		</Modal>
	);
}
