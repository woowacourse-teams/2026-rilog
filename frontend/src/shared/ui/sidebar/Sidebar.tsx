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

const FOCUS_CLASS_NAME = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring';
const EXPANDED_TEXT_CLASS_NAME =
	'whitespace-nowrap opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100';
const EXPANDED_ACTION_TEXT_CLASS_NAME =
	'max-w-0 overflow-hidden whitespace-nowrap opacity-0 transition-[max-width,opacity] duration-150 group-hover:max-w-32 group-hover:opacity-100 group-focus-within:max-w-32 group-focus-within:opacity-100';

export default function Sidebar({ isAuthenticated = true }: SidebarProps) {
	return (
		<aside
			aria-label="사이드바"
			className="group fixed inset-y-0 left-0 z-40 flex h-dvh w-17.5 flex-col overflow-hidden border-r border-border-default bg-surface transition-[width] duration-200 ease-out focus-within:w-60 hover:w-60"
		>
			<header className="flex h-16 w-60 shrink-0 items-center px-3">
				<Link
					href="/"
					aria-label="Rilog 메인으로 이동"
					className={`flex h-10 w-11.5 shrink-0 items-center overflow-hidden rounded-lg px-2.5 text-title-2 font-extrabold tracking-tight text-brand-primary transition-[width] duration-200 group-focus-within:w-52 group-hover:w-52 ${FOCUS_CLASS_NAME}`}
				>
					<span className="shrink-0">R</span>
					<span className="max-w-0 overflow-hidden opacity-0 transition-[max-width,opacity] duration-200 group-focus-within:max-w-16 group-focus-within:opacity-100 group-hover:max-w-16 group-hover:opacity-100">
						ilog
					</span>
					<span className="text-navy-500">.</span>
				</Link>
			</header>

			<div className="min-h-0 w-60 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-4">
				<nav aria-label="주요 메뉴" className="pt-2">
					<Link
						href="/feeds"
						aria-label={isAuthenticated ? '피드 132' : '피드'}
						aria-current="page"
						className={`flex h-11 w-11.5 items-center gap-3 overflow-hidden rounded-lg bg-navy-100 px-3.5 text-brand-primary transition-[width,background-color] duration-200 group-focus-within:w-full group-hover:w-full hover:bg-navy-50 active:bg-navy-200 ${FOCUS_CLASS_NAME}`}
					>
						{/* TODO: 아이콘으로 교체 필요 */}
						<span aria-hidden="true" className="flex w-4 shrink-0 flex-col gap-1">
							<span className="h-0.5 w-full rounded-full bg-current" />
							<span className="h-0.5 w-full rounded-full bg-current" />
							<span className="h-0.5 w-3/4 rounded-full bg-current" />
						</span>
						<span className={`text-label-2 font-semibold ${EXPANDED_TEXT_CLASS_NAME}`}>Feed</span>
						{isAuthenticated && (
							<span
								className={`ml-auto rounded-full bg-surface px-2 py-0.5 text-caption-1 font-semibold text-text-secondary ${EXPANDED_TEXT_CLASS_NAME}`}
							>
								132
							</span>
						)}
					</Link>
				</nav>

				{isAuthenticated && (
					<nav aria-label="내 Co-log" className="mt-7">
						<h2
							className={`h-4 px-2 text-label-1 font-semibold tracking-wide text-text-secondary ${EXPANDED_TEXT_CLASS_NAME}`}
						>
							My Co-log
						</h2>
						<ul className="mt-2 space-y-0.5">
							{TEAMS.map((team) => (
								<li key={team.href}>
									<Link
										href={team.href}
										className={`flex h-10 w-11.5 items-center gap-3 overflow-hidden rounded-lg px-2 text-label-2 text-text-secondary transition-[width,background-color,color] duration-200 group-focus-within:w-full group-hover:w-full hover:bg-surface-hover hover:text-text-primary active:bg-surface-active ${FOCUS_CLASS_NAME}`}
									>
										<div
											aria-hidden="true"
											className={`flex size-7 shrink-0 items-center justify-center rounded-md text-caption-2 font-bold ${team.colorClassName}`}
										>
											{team.monogram}
										</div>
										<span className={`truncate ${EXPANDED_TEXT_CLASS_NAME}`}>{team.name}</span>
									</Link>
								</li>
							))}
						</ul>
						<Button
							variant="secondary"
							aria-label="Co-log 만들기"
							className="mt-3 w-11.5! gap-0! overflow-hidden border-dashed px-0! text-text-secondary group-focus-within:w-full! group-focus-within:gap-2! group-hover:w-full! group-hover:gap-2!"
						>
							<span aria-hidden="true" className="shrink-0 text-body-2 leading-none">
								+
							</span>
							<span className={EXPANDED_ACTION_TEXT_CLASS_NAME}>Co-log 만들기</span>
						</Button>
					</nav>
				)}
			</div>

			{isAuthenticated ? (
				<>
					<div className="w-60 shrink-0 px-3 pb-3">
						<Link
							href="/write"
							className={`flex h-btn-height-md w-11.5 items-center justify-center gap-0 overflow-hidden rounded-lg bg-btn-primary px-0 text-label-2 font-semibold text-btn-primary-foreground transition-[width,background-color,gap] duration-200 group-focus-within:w-full group-focus-within:gap-2 group-hover:w-full group-hover:gap-2 hover:bg-btn-primary-hover active:bg-btn-primary-active ${FOCUS_CLASS_NAME}`}
						>
							<span aria-hidden="true" className="shrink-0 text-body-3 leading-none">
								+
							</span>
							<span className={EXPANDED_ACTION_TEXT_CLASS_NAME}>글쓰기</span>
						</Link>
					</div>

					<footer className="w-60 shrink-0 border-t border-border-default p-3">
						<div className="flex w-11.5 items-center gap-1 overflow-hidden rounded-xl bg-surface-hover p-1.5 transition-[width] duration-200 group-focus-within:w-full group-hover:w-full">
							<Link
								href="/profile"
								aria-label="파라디 @JetProc"
								className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg ${FOCUS_CLASS_NAME}`}
							>
								<div
									aria-hidden="true"
									className="flex size-8 shrink-0 items-center justify-center rounded-full bg-navy-200 text-caption-2 font-bold text-navy-800"
								>
									P
								</div>
								<span className={`min-w-0 ${EXPANDED_TEXT_CLASS_NAME}`}>
									<strong className="block truncate text-label-2 font-semibold text-text-primary">파라디</strong>
									<span className="block truncate text-caption-2 text-text-secondary">@JetProc</span>
								</span>
							</Link>
							<Link
								href="/logout"
								aria-label="로그아웃"
								className={`flex size-10 shrink-0 items-center justify-center rounded-lg text-text-secondary opacity-0 transition-[opacity,background-color] group-focus-within:opacity-100 group-hover:opacity-100 hover:bg-surface active:bg-surface-active ${FOCUS_CLASS_NAME}`}
							>
								<span aria-hidden="true" className="text-caption-2">
									나가기
								</span>
							</Link>
						</div>
					</footer>
				</>
			) : (
				<footer className="w-60 shrink-0 border-t border-border-default p-3">
					<Link
						href="/login"
						aria-label="로그인"
						className={`flex h-btn-height-md w-11.5 items-center justify-center gap-0 overflow-hidden rounded-md bg-btn-primary px-0 text-label-2 font-semibold text-btn-primary-foreground transition-[width,background-color,gap] duration-200 group-focus-within:w-full group-focus-within:gap-2 group-hover:w-full group-hover:gap-2 hover:bg-btn-primary-hover active:bg-btn-primary-active ${FOCUS_CLASS_NAME}`}
					>
						<span aria-hidden="true" className="shrink-0 text-body-3">
							→
						</span>
						<span className={EXPANDED_ACTION_TEXT_CLASS_NAME}>로그인</span>
					</Link>
				</footer>
			)}
		</aside>
	);
}
