'use client';

import { useState } from 'react';

import type { PublicationNavigationItem } from './blog-home-publications';

import type { BlogType } from '@/domains/blog/model/blog';

import { AFFILIATED_COLOGS, COLOG_CHAPTERS, SERIES } from './blog-home-publications';

interface BlogHomeNavigationProps {
	blogType: BlogType;
}

const rowClassName = (isNested = false) =>
	[
		'flex min-h-7 w-fit max-w-full items-center gap-1.5 py-0.5 text-left text-body-1 font-normal text-navy-600',
		isNested ? 'pl-4' : 'pl-0',
	]
		.filter(Boolean)
		.join(' ');

function NavigationRow({ item, isNested = false }: { item: PublicationNavigationItem; isNested?: boolean }) {
	return (
		<div className={rowClassName(isNested)}>
			<span className="min-w-0 truncate">{item.name}</span>
			<span className="shrink-0 text-label-1 text-text-disabled">{item.postCount}</span>
		</div>
	);
}

export default function BlogHomeNavigation({ blogType }: BlogHomeNavigationProps) {
	const [expandedCologIds, setExpandedCologIds] = useState<Set<string>>(() => new Set());

	const toggleColog = (cologId: string) => {
		setExpandedCologIds((currentIds) => {
			const nextIds = new Set(currentIds);
			if (nextIds.has(cologId)) {
				nextIds.delete(cologId);
			} else {
				nextIds.add(cologId);
			}
			return nextIds;
		});
	};

	if (blogType === 'COLOG') {
		return (
			<nav aria-label="챕터 탐색" className="w-full">
				<h2 className="mb-3 text-body-2 font-semibold text-text-primary">챕터</h2>
				<div className="flex flex-col">
					{COLOG_CHAPTERS.map((chapter) => (
						<NavigationRow key={chapter.id} item={chapter} />
					))}
				</div>
			</nav>
		);
	}

	return (
		<nav aria-label="시리즈와 코로그 탐색" className="w-full">
			<h2 className="sr-only">시리즈와 코로그</h2>
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
					{AFFILIATED_COLOGS.map((colog) => {
						const isExpanded = expandedCologIds.has(colog.id);
						const chapterGroupId = `${colog.id}-chapters`;

						return (
							<div key={colog.id}>
								<div className="flex items-stretch">
									<button
										type="button"
										aria-label={`${colog.name} 챕터 ${isExpanded ? '접기' : '펼치기'}`}
										aria-controls={chapterGroupId}
										aria-expanded={isExpanded}
										className="flex min-h-11 w-5 shrink-0 items-center justify-center text-navy-600 transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring active:text-text-primary motion-reduce:transition-none sm:min-h-7"
										onClick={() => toggleColog(colog.id)}
									>
										<span
											aria-hidden="true"
											className={`text-title-1 transition-transform duration-200 motion-reduce:transition-none ${isExpanded ? 'rotate-90' : ''}`}
										>
											›
										</span>
									</button>
									<NavigationRow item={colog} />
								</div>

								{isExpanded && (
									<div id={chapterGroupId} role="group" aria-label={`${colog.name} 챕터`} className="ml-3">
										{colog.chapters.length === 0 ? (
											<p className="min-h-7 py-1 pl-6 text-label-2 text-text-disabled">발행한 챕터가 없어요</p>
										) : (
											colog.chapters.map((chapter) => <NavigationRow key={chapter.id} item={chapter} isNested />)
										)}
									</div>
								)}
							</div>
						);
					})}
				</div>
			</section>
		</nav>
	);
}
