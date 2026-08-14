'use client';

import { useState } from 'react';

import LoginModal from '@/features/login/ui/LoginModal';
import Button from '@/shared/ui/button/Button';

import { EXPANDED_TEXT_CLASS_NAME, EXPANDING_ACTION_CLASS_NAME } from './sidebar-class-names';

export default function GuestSidebarFooter() {
	const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

	return (
		<>
			<footer className="w-full shrink-0 border-t border-border-default p-3">
				<Button
					aria-label="로그인"
					fullWidth
					className={EXPANDING_ACTION_CLASS_NAME}
					onClick={() => setIsLoginModalOpen(true)}
				>
					<span aria-hidden="true" className="shrink-0 text-body-3">
						→
					</span>
					<span className={EXPANDED_TEXT_CLASS_NAME}>로그인</span>
				</Button>
			</footer>

			<LoginModal open={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
		</>
	);
}
