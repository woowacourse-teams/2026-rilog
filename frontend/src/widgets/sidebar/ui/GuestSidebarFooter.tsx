'use client';

import { useAuthAction } from '@/features/login/model/use-auth-action';
import Button from '@/shared/ui/button/Button';
import LogInIcon from '@/widgets/sidebar/assets/log-in.svg';

import { EXPANDED_TEXT_CLASS_NAME, EXPANDING_ACTION_CLASS_NAME, SIDEBAR_GLYPH_CLASS_NAME } from './sidebar-class-names';

export default function GuestSidebarFooter() {
	const handleLoginClick = useAuthAction({ isAuthenticated: false });

	return (
		<footer className="w-full shrink-0 border-t border-border-default p-3">
			<Button aria-label="로그인" fullWidth className={EXPANDING_ACTION_CLASS_NAME} onClick={handleLoginClick}>
				<LogInIcon aria-hidden="true" focusable="false" className={SIDEBAR_GLYPH_CLASS_NAME} />
				<span className={EXPANDED_TEXT_CLASS_NAME}>로그인</span>
			</Button>
		</footer>
	);
}
