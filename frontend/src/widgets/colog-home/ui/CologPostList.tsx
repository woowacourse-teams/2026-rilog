import Link from 'next/link';

import { formatPublishedDate } from '@/domains/post/lib/format-published-date';
import UserAvatar from '@/domains/user/ui/UserAvatar';
import type { CologHomePost } from '@/widgets/colog-home/model/colog-home';

interface CologPostListProps {
	posts: readonly CologHomePost[];
}

export default function CologPostList({ posts }: CologPostListProps) {
	return (
		<section aria-label="코로그 게시글" className="min-w-0">
			{posts.length === 0 ? (
				<p className="text-body-2 text-text-secondary">아직 작성된 게시글이 없습니다.</p>
			) : (
				<ul className="flex flex-col gap-7">
					{posts.map((post) => (
						<li key={post.id}>
							<Link
								href={`/posts/${post.id}`}
								className="group grid min-h-27 grid-cols-[120px_minmax(0,1fr)] gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-focus-ring sm:grid-cols-[200px_minmax(0,1fr)]"
							>
								<div className="h-27 rounded-lg bg-brand-primary p-2">{/* 썸네일 이미지 */}</div>

								<article className="flex min-w-0 flex-col justify-between py-1">
									<h2 className="line-clamp-2 text-body-2 font-semibold text-text-primary transition-colors group-hover:text-focus-ring sm:text-body-4">
										{post.title}
									</h2>
									<div className="flex items-center gap-1.5 text-label-1 text-navy-600">
										<UserAvatar
											src={post.author.profileImageUrl ?? undefined}
											fallback={post.author.nickname.slice(0, 1)}
											label={`${post.author.nickname} 프로필`}
											size="sm"
											className="bg-navy-100"
										/>
										<span>{post.author.nickname}</span>
										<span aria-hidden="true">·</span>
										<time dateTime={post.publishedAt}>{formatPublishedDate(post.publishedAt)}</time>
									</div>
								</article>
							</Link>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
