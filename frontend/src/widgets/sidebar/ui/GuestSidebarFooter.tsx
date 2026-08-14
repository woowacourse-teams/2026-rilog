import ButtonLink from '@/shared/ui/button/ButtonLink';

import { EXPANDED_TEXT_CLASS_NAME, EXPANDING_ACTION_CLASS_NAME } from './sidebar-class-names';

export default function GuestSidebarFooter() {
	return (
		<footer className="w-full shrink-0 border-t border-border-default p-3">
			<ButtonLink href="/login" aria-label="로그인" fullWidth className={EXPANDING_ACTION_CLASS_NAME}>
				<span aria-hidden="true" className="shrink-0 text-body-3">
					→
				</span>
				<span className={EXPANDED_TEXT_CLASS_NAME}>로그인</span>
			</ButtonLink>
		</footer>
	);
}
