import Image from 'next/image';

import { APP_ROUTES } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';

import { FOCUS_CLASS_NAME } from './sidebar-class-names';

export default function SidebarHeader() {
	return (
		<header className="flex h-16 w-full shrink-0 items-center px-3">
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
		</header>
	);
}
