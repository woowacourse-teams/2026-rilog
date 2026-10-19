'use client';

import { useAuthAction } from '@/features/login/model/use-auth-action';
import Button from '@/shared/ui/button/Button';
import Divider from '@/shared/ui/divider/Divider';
import LogInIcon from '@/widgets/sidebar/assets/log-in.svg';

import { EXPANDED_TEXT_CLASS_NAME, EXPANDING_ACTION_CLASS_NAME, SIDEBAR_GLYPH_CLASS_NAME } from './sidebar-class-names';
import WriteButton from './WriteButton';

export default function GuestSidebarFooter() {
	const handleLoginClick = useAuthAction({ entrySurface: 'sidebar' });

	return (
		<div className="w-full shrink-0 space-y-2 px-1.75 py-3">
			<WriteButton />
			<Divider />
			<Button
				aria-label="로그인"
				fullWidth
				variant="secondary"
				className={`rounded-lg! ${EXPANDING_ACTION_CLASS_NAME}`}
				onClick={handleLoginClick}
			>
				<span className="flex h-full w-11.25 shrink-0 items-center justify-center">
					<LogInIcon aria-hidden="true" focusable="false" className={SIDEBAR_GLYPH_CLASS_NAME} />
				</span>
				<span className={`absolute left-1/2 -translate-x-1/2 ${EXPANDED_TEXT_CLASS_NAME}`}>로그인</span>
			</Button>
		</div>
	);
}
