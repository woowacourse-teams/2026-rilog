import UserAvatar from '@/domains/user/ui/UserAvatar';
import { recordEditorEntryContext } from '@/features/analytics/lib/editor-entry-context';
import { useLogoutMutation } from '@/shared/api/auth/mutations/use-logout-mutation';
import { useMyInfoQuery } from '@/shared/api/users/queries/my-info/use-query';
import { APP_ROUTES, buildBlogHomePath } from '@/shared/routes/app-routes';
import Button from '@/shared/ui/button/Button';
import ButtonLink from '@/shared/ui/button/ButtonLink';
import CustomLink from '@/shared/ui/link/CustomLink';
import LogOutIcon from '@/widgets/sidebar/assets/log-out.svg';
import WriteIcon from '@/widgets/sidebar/assets/write.svg';

import { mapMyInfoResponse } from '../lib/map-my-info-response';

import {
	EXPANDED_TEXT_CLASS_NAME,
	EXPANDING_ACTION_CLASS_NAME,
	FOCUS_CLASS_NAME,
	SIDEBAR_GLYPH_CLASS_NAME,
} from './sidebar-class-names';

export default function AuthenticatedSidebarFooter() {
	const myInfoQuery = useMyInfoQuery({ select: mapMyInfoResponse });
	const { mutate: executeLogout } = useLogoutMutation();

	const handleLogout = () => {
		executeLogout();
	};

	const user = myInfoQuery.data;
	const hasInitialError = user === null || (user === undefined && !myInfoQuery.isPending);
	const profileStatusMessage = hasInitialError ? '내 정보를 불러오지 못했어요.' : '내 정보를 불러오는 중';
	const nickname = user?.nickname ?? '';
	const slug = user?.slug ?? '';
	const fallback = user?.nickname.slice(0, 1).toUpperCase() ?? '';

	return (
		<>
			<div className="w-full shrink-0 px-1.75 pb-3">
				<ButtonLink
					href={APP_ROUTES.write}
					onClick={() => recordEditorEntryContext('sidebar')}
					fullWidth
					className={`rounded-lg! ${EXPANDING_ACTION_CLASS_NAME}`}
				>
					<span className="flex h-full w-11.25 shrink-0 items-center justify-center">
						<WriteIcon aria-hidden="true" focusable="false" className={SIDEBAR_GLYPH_CLASS_NAME} />
					</span>
					<span className={`absolute left-1/2 -translate-x-1/2 ${EXPANDED_TEXT_CLASS_NAME}`}>글쓰기</span>
				</ButtonLink>
			</div>

			<footer className="w-full shrink-0 px-1.75 py-3">
				<div className="flex w-56.25 items-center px-0.5 py-1.5">
					{user ? (
						<CustomLink
							href={buildBlogHomePath(slug)}
							aria-label={`${nickname} @${slug}`}
							className={`flex min-w-0 flex-1 items-center justify-start gap-2 rounded-lg transition-colors hover:bg-surface-hover active:bg-surface-active ${FOCUS_CLASS_NAME}`}
						>
							<UserAvatar src={user.profileImageUrl} fallback={fallback} size="lg" />
							<span className={`min-w-0 ${EXPANDED_TEXT_CLASS_NAME}`}>
								<strong className="block truncate text-label-2 font-semibold text-text-primary">{nickname}</strong>
								<span className="block truncate text-caption-1 text-text-secondary">@{slug}</span>
							</span>
						</CustomLink>
					) : hasInitialError ? (
						<div
							className="flex min-w-0 flex-1 items-center justify-start gap-2"
							aria-label={profileStatusMessage}
							role={hasInitialError ? 'alert' : 'status'}
						>
							<UserAvatar fallback={hasInitialError ? '!' : '…'} size="lg" tone="subtle" />
							<span className={`min-w-0 ${EXPANDED_TEXT_CLASS_NAME}`}>
								<strong
									className="block truncate text-label-2 font-semibold text-text-primary"
									title={hasInitialError ? profileStatusMessage : undefined}
								>
									{hasInitialError ? '내 정보 오류' : profileStatusMessage}
								</strong>
							</span>
						</div>
					) : (
						<div
							className="flex min-w-0 flex-1 items-center justify-start gap-2"
							aria-label={profileStatusMessage}
							role="status"
						>
							<span className="flex size-10 shrink-0 items-center justify-center" aria-hidden="true">
								<span className="size-6 animate-pulse rounded-full bg-surface-active motion-reduce:animate-none" />
							</span>
							<span
								aria-hidden="true"
								className="h-3 w-20 animate-pulse rounded bg-surface-active motion-reduce:animate-none"
							/>
						</div>
					)}
					<span
						aria-hidden="true"
						className="invisible mx-1 h-7 w-px shrink-0 bg-border-default opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 motion-reduce:transition-none"
					/>
					<Button
						aria-label="로그아웃"
						onClick={handleLogout}
						size="icon"
						variant="ghost"
						className={`invisible flex! shrink-0 items-center justify-center opacity-0 transition-opacity group-hover:visible group-hover:opacity-100 ${FOCUS_CLASS_NAME}`}
					>
						<LogOutIcon aria-hidden="true" focusable="false" className={SIDEBAR_GLYPH_CLASS_NAME} />
					</Button>
				</div>
			</footer>
		</>
	);
}
