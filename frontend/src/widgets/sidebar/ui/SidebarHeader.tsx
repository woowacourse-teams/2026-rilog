import Link from 'next/link';

import { EXPANDED_TEXT_CLASS_NAME, FOCUS_CLASS_NAME } from './sidebar-class-names';

export default function SidebarHeader() {
	return (
		<header className="flex h-16 w-full shrink-0 items-center px-3">
			<Link
				href="/"
				aria-label="Rilog 메인으로 이동"
				className={`flex h-10 w-full shrink-0 items-center rounded-lg px-2.5 text-title-2 font-extrabold tracking-tight text-brand-primary ${FOCUS_CLASS_NAME}`}
			>
				<span className="shrink-0">R</span>
				<span className={EXPANDED_TEXT_CLASS_NAME}>ilog</span>
				<span className="text-navy-500">.</span>
			</Link>
		</header>
	);
}
