import UserAvatar from '@/domains/user/ui/UserAvatar';
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
	const { data: user } = useMyInfoQuery({ select: mapMyInfoResponse });
	const { mutate: executeLogout } = useLogoutMutation();

	const handleLogout = () => {
		executeLogout();
	};

	const nickname = user?.nickname ?? '알 수 없음';
	const slug = user?.slug ?? '';
	const profileImageUrl = user?.profileImageUrl;
	const fallback = user?.nickname?.slice(0, 1).toUpperCase() ?? 'P';

	return (
		<>
			<div className="w-full shrink-0 px-3 pb-3">
				<ButtonLink href={APP_ROUTES.write} fullWidth className={`rounded-lg! ${EXPANDING_ACTION_CLASS_NAME}`}>
					<WriteIcon aria-hidden="true" focusable="false" className={SIDEBAR_GLYPH_CLASS_NAME} />
					<span className={EXPANDED_TEXT_CLASS_NAME}>글쓰기</span>
				</ButtonLink>
			</div>

			<footer className="w-full shrink-0 border-t border-border-default p-3">
				<div className="flex w-full items-center gap-1 rounded-xl bg-transparent p-1.5 transition-colors group-hover:bg-surface-hover">
					<CustomLink
						href={slug ? buildBlogHomePath(slug) : '#'}
						aria-label={`${nickname} @${slug}`}
						className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg group-hover:justify-start ${FOCUS_CLASS_NAME}`}
					>
						<UserAvatar src={profileImageUrl} fallback={fallback} size="lg" />
						<span className={`min-w-0 ${EXPANDED_TEXT_CLASS_NAME}`}>
							<strong className="block truncate text-label-2 font-semibold text-text-primary">{nickname}</strong>
							<span className="block truncate text-caption-1 text-text-secondary">@{slug}</span>
						</span>
					</CustomLink>
					<Button
						aria-label="로그아웃"
						onClick={handleLogout}
						size="icon"
						variant="ghost"
						className={`hidden! shrink-0 items-center justify-center group-hover:flex! ${FOCUS_CLASS_NAME}`}
					>
						<LogOutIcon aria-hidden="true" focusable="false" className={SIDEBAR_GLYPH_CLASS_NAME} />
					</Button>
				</div>
			</footer>
		</>
	);
}
