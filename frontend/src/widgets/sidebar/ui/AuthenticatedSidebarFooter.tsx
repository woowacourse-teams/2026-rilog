import Link from 'next/link';

import UserAvatar from '@/domains/user/ui/UserAvatar';
import { APP_ROUTES, buildCologHomePath } from '@/shared/routes/app-routes';
import Button from '@/shared/ui/button/Button';
import ButtonLink from '@/shared/ui/button/ButtonLink';
import LogOutIcon from '@/widgets/sidebar/assets/log-out.svg';
import WriteIcon from '@/widgets/sidebar/assets/write.svg';

import {
	EXPANDED_TEXT_CLASS_NAME,
	EXPANDING_ACTION_CLASS_NAME,
	FOCUS_CLASS_NAME,
	SIDEBAR_GLYPH_CLASS_NAME,
} from './sidebar-class-names';

export default function AuthenticatedSidebarFooter() {
	return (
		<>
			<div className="w-full shrink-0 px-3 pb-3">
				<ButtonLink href={APP_ROUTES.write} fullWidth className={`rounded-lg! ${EXPANDING_ACTION_CLASS_NAME}`}>
					<WriteIcon aria-hidden="true" focusable="false" className={SIDEBAR_GLYPH_CLASS_NAME} />
					<span className={EXPANDED_TEXT_CLASS_NAME}>글쓰기</span>
				</ButtonLink>
			</div>

			<footer className="w-full shrink-0 border-t border-border-default p-3">
				<div className="flex w-full items-center gap-1 rounded-xl bg-transparent p-1.5 transition-colors group-focus-within:bg-surface-hover group-hover:bg-surface-hover">
					<Link
						href={buildCologHomePath('jetproc')}
						aria-label="파라디 @JetProc"
						className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg group-focus-within:justify-start group-hover:justify-start ${FOCUS_CLASS_NAME}`}
					>
						<UserAvatar fallback="P" size="lg" />
						<span className={`min-w-0 ${EXPANDED_TEXT_CLASS_NAME}`}>
							<strong className="block truncate text-label-2 font-semibold text-text-primary">파라디</strong>
							<span className="block truncate text-caption-1 text-text-secondary">@JetProc</span>
						</span>
					</Link>
					<Button
						aria-label="로그아웃"
						size="icon"
						variant="ghost"
						className={`hidden! shrink-0 items-center justify-center group-focus-within:flex! group-hover:flex! ${FOCUS_CLASS_NAME}`}
					>
						<LogOutIcon aria-hidden="true" focusable="false" className={SIDEBAR_GLYPH_CLASS_NAME} />
					</Button>
				</div>
			</footer>
		</>
	);
}
