import Link from 'next/link';

import UserAvatar from '@/domains/user/ui/UserAvatar';
import Button from '@/shared/ui/button/Button';
import ButtonLink from '@/shared/ui/button/ButtonLink';

import { EXPANDED_TEXT_CLASS_NAME, EXPANDING_ACTION_CLASS_NAME, FOCUS_CLASS_NAME } from './sidebar-class-names';

export default function AuthenticatedSidebarFooter() {
	return (
		<>
			<div className="w-full shrink-0 px-3 pb-3">
				<ButtonLink href="/write" fullWidth className={`rounded-lg! ${EXPANDING_ACTION_CLASS_NAME}`}>
					<span aria-hidden="true" className="shrink-0 text-body-3 leading-none">
						+
					</span>
					<span className={EXPANDED_TEXT_CLASS_NAME}>글쓰기</span>
				</ButtonLink>
			</div>

			<footer className="w-full shrink-0 border-t border-border-default p-3">
				<div className="flex w-full items-center gap-1 rounded-xl bg-transparent p-1.5 transition-colors group-focus-within:bg-surface-hover group-hover:bg-surface-hover">
					<Link
						href="/profile"
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
						size="icon"
						variant="ghost"
						className={`hidden! shrink-0 items-center justify-center group-focus-within:flex! group-hover:flex! ${FOCUS_CLASS_NAME}`}
					>
						{/* TODO: 아이콘으로 교체 필요 */}
						<span aria-hidden="true" className="text-caption-2">
							나가기
						</span>
					</Button>
				</div>
			</footer>
		</>
	);
}
