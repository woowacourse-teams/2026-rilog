import Image from 'next/image';

import { APP_ROUTES } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';

import { FOCUS_CLASS_NAME } from './sidebar-class-names';

export default function SidebarHeader() {
	return (
		<header className="relative flex h-16 w-full shrink-0 items-center px-1.75">
			<CustomLink
				href={APP_ROUTES.feeds}
				aria-label="Rilog 메인으로 이동"
				className={`flex h-10 w-full shrink-0 items-center rounded-lg px-2.5 ${FOCUS_CLASS_NAME}`}
			>
				<span className="relative block h-7 w-25 shrink-0">
					<Image
						src="/brand/sidebar-icon.svg"
						alt=""
						width={418}
						height={364}
						className="absolute top-0 h-5.5 w-auto transition-opacity duration-150"
						priority
					/>
					<Image
						src="/brand/logo.svg"
						alt=""
						width={1186}
						height={472}
						className="absolute top-0 h-7 w-auto opacity-0 transition-opacity duration-150 group-hover:opacity-100"
						priority
					/>
				</span>
			</CustomLink>
			<CustomLink
				href="/about"
				target="_blank"
				className={`invisible absolute right-3 rounded text-body-1 font-medium whitespace-nowrap text-text-secondary underline underline-offset-2 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 hover:text-focus-ring active:text-focus-ring motion-reduce:transition-none ${FOCUS_CLASS_NAME}`}
			>
				Rilog. 이야기 ↗
			</CustomLink>
		</header>
	);
}
