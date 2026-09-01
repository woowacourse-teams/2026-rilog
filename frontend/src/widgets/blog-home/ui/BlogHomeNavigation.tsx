import type { PublicationNavigationItem } from './blog-home-publications';

import type { BlogType } from '@/domains/blog/model/blog';

import { AFFILIATED_COLOGS, COLOG_CHAPTERS, SERIES } from './blog-home-publications';

interface BlogHomeNavigationProps {
	blogType: BlogType;
}

const ROW_CLASS_NAME =
	'flex min-h-11 min-w-0 flex-1 items-center gap-1.5 rounded-sm px-2 text-left text-body-1 font-normal text-navy-600 transition-colors hover:bg-surface-hover hover:text-text-primary focus-visible:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus-ring active:bg-surface-active motion-reduce:transition-none sm:min-h-7';

function NavigationRow({ item }: { item: PublicationNavigationItem }) {
	return (
		<button type="button" aria-label={`${item.name}, 글 ${item.postCount}개`} className={ROW_CLASS_NAME}>
			<span className="min-w-0 truncate">{item.name}</span>
			<span className="shrink-0 text-label-1 text-text-disabled">{item.postCount}</span>
		</button>
	);
}

function AllPostsRow() {
	return (
		<button
			type="button"
			aria-current="page"
			className="flex min-h-11 w-full items-center rounded-sm px-2 text-left text-body-1 font-semibold text-text-primary transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:outline-2 focus-visible:outline-focus-ring active:bg-surface-active motion-reduce:transition-none sm:min-h-7"
		>
			전체보기
		</button>
	);
}

export default function BlogHomeNavigation({ blogType }: BlogHomeNavigationProps) {
	if (blogType === 'COLOG') {
		return (
			<nav aria-label="챕터 탐색" className="w-full">
				<section aria-labelledby="chapter-navigation-title">
					<h2 id="chapter-navigation-title" className="mb-1 text-body-2 font-semibold text-text-primary">
						챕터
					</h2>
					<div className="flex flex-col">
						<AllPostsRow />
						{COLOG_CHAPTERS.map((chapter) => (
							<NavigationRow key={chapter.id} item={chapter} />
						))}
					</div>
				</section>
			</nav>
		);
	}

	return (
		<nav aria-label="시리즈와 코로그 탐색" className="w-full">
			<h2 className="sr-only">시리즈와 코로그</h2>
			<AllPostsRow />
			<section aria-labelledby="series-navigation-title" className="mt-6">
				<h3 id="series-navigation-title" className="mb-1 text-body-2 font-semibold text-text-primary">
					시리즈
				</h3>
				<div className="flex flex-col">
					{SERIES.map((series) => (
						<NavigationRow key={series.id} item={series} />
					))}
				</div>
			</section>

			<section aria-labelledby="colog-navigation-title" className="mt-6">
				<h3 id="colog-navigation-title" className="mb-1 text-body-2 font-semibold text-text-primary">
					코로그
				</h3>
				<div className="flex flex-col">
					{AFFILIATED_COLOGS.map((colog) => (
						<NavigationRow key={colog.id} item={colog} />
					))}
				</div>
			</section>
		</nav>
	);
}
