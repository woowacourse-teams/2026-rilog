import Link from 'next/link';

import Button from '@/shared/ui/button/Button';

interface SidebarProps {
	isAuthenticated?: boolean;
}

// TODO: 추후 slug 기반으로 href 생성 필요, 전체적인 객체 구조 변경 예정
const TEAMS = [
	{ href: '/teams/toss-tech', monogram: 'T', name: '토스 테크', colorClassName: 'bg-navy-100 text-navy-700' },
	{
		href: '/teams/woowacourse',
		monogram: 'W',
		name: '우아한테크코스',
		colorClassName: 'bg-navy-200 text-navy-800',
	},
	{ href: '/teams/baemin', monogram: 'B', name: '배달의 민족', colorClassName: 'bg-navy-100 text-navy-700' },
	{
		href: '/teams/andromeda',
		monogram: 'A',
		name: '안드로메다',
		colorClassName: 'bg-navy-200 text-navy-800',
	},
] as const;

const FOCUS_CLASS_NAME = 'focus-visible:outline-2 focus-visible:outline-focus-ring';

export default function Sidebar({ isAuthenticated = true }: SidebarProps) {
	return (
		<aside
			aria-label="사이드바"
			className="fixed inset-y-0 left-0 z-40 flex h-dvh w-60 flex-col border-r border-border-default bg-surface"
		>
			<header className="flex h-16 shrink-0 items-center px-5">
				<Link
					href="/"
					aria-label="Rilog 메인으로 이동"
					className={`text-title-2 font-extrabold tracking-tight text-brand-primary ${FOCUS_CLASS_NAME}`}
				>
					Rilog<span className="text-navy-500">.</span>
				</Link>
			</header>

			<div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
				<nav aria-label="주요 메뉴" className="pt-2">
					<Link
						href="/feeds"
						aria-label={isAuthenticated ? '피드 132' : '피드'}
						aria-current="page"
						className={`flex h-11 items-center gap-3 rounded-lg bg-navy-100 px-3 text-brand-primary transition-colors hover:bg-navy-50 active:bg-navy-200 ${FOCUS_CLASS_NAME}`}
					>
						{/* TODO: 아이콘으로 교체 필요 */}
						<span aria-hidden="true" className="flex w-4 flex-col gap-1">
							<span className="h-0.5 w-full rounded-full bg-current" />
							<span className="h-0.5 w-full rounded-full bg-current" />
							<span className="h-0.5 w-3/4 rounded-full bg-current" />
						</span>
						<span className="text-label-2 font-semibold">Feed</span>
						{isAuthenticated && (
							<span className="ml-auto rounded-full bg-surface px-2 py-0.5 text-caption-1 font-semibold text-text-secondary">
								132
							</span>
						)}
					</Link>
				</nav>

				{isAuthenticated && (
					<nav aria-label="내 Co-log" className="mt-7">
						<h2 className="px-2 text-label-1 font-semibold tracking-wide text-text-secondary">My Co-log</h2>
						<ul className="mt-2 space-y-0.5">
							{TEAMS.map((team) => (
								<li key={team.href}>
									<Link
										href={team.href}
										className={`flex h-10 items-center gap-3 rounded-lg px-2 text-label-2 text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary active:bg-surface-active ${FOCUS_CLASS_NAME}`}
									>
										<div
											aria-hidden="true"
											className={`flex size-7 shrink-0 items-center justify-center rounded-md text-caption-2 font-bold ${team.colorClassName}`}
										>
											{team.monogram}
										</div>
										<span className="truncate">{team.name}</span>
									</Link>
								</li>
							))}
						</ul>
						<Button fullWidth variant="secondary" className="mt-3 border-dashed text-text-secondary">
							Co-log 만들기
						</Button>
					</nav>
				)}
			</div>

			{isAuthenticated ? (
				<>
					<div className="shrink-0 px-3 pb-3">
						<Link
							href="/write"
							className={`flex h-btn-height-md items-center justify-center gap-2 rounded-lg bg-btn-primary px-btn-inline-lg text-label-2 font-semibold text-btn-primary-foreground transition-colors hover:bg-btn-primary-hover active:bg-btn-primary-active ${FOCUS_CLASS_NAME}`}
						>
							글쓰기
						</Link>
					</div>

					<footer className="shrink-0 border-t border-border-default p-3">
						<div className="flex items-center gap-1 rounded-xl bg-surface-hover p-1.5">
							<Link
								href="/profile"
								aria-label="파라디 @JetProc"
								className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg p-1 ${FOCUS_CLASS_NAME}`}
							>
								<div
									aria-hidden="true"
									className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy-200 text-caption-2 font-bold text-navy-800"
								>
									P
								</div>
								<span className="min-w-0">
									<strong className="block truncate text-label-2 font-semibold text-text-primary">파라디</strong>
									<span className="block truncate text-caption-2 text-text-secondary">@JetProc</span>
								</span>
							</Link>
							{/* TODO: 아이콘으로 교체 필요 */}
							<Button size="icon" variant="ghost">
								로그아웃
							</Button>
						</div>
					</footer>
				</>
			) : (
				<footer className="shrink-0 border-t border-border-default p-3">
					<Link
						href="/login"
						className={`flex h-btn-height-md items-center justify-center rounded-md bg-btn-primary px-btn-inline-md text-label-2 font-semibold text-btn-primary-foreground transition-colors hover:bg-btn-primary-hover active:bg-btn-primary-active ${FOCUS_CLASS_NAME}`}
					>
						로그인
					</Link>
				</footer>
			)}
		</aside>
	);
}
