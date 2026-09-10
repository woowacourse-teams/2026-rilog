import { Suspense } from 'react';

import CologAvatar from '@/domains/blog/ui/CologAvatar';
import type { PostDetail as PostDetailModel } from '@/domains/post/model/post';
import ChapterPostSuggestionSection from '@/features/post-detail/ui/ChapterPostSuggestionSection';
import PostDetailAuthorProfileSection from '@/features/post-detail/ui/PostDetailAuthorProfileSection';
import PostDetailAuthorProfileSmall from '@/features/post-detail/ui/PostDetailAuthorProfileSmall';
import PostDetailBlogProfile from '@/features/post-detail/ui/PostDetailBlogProfile';
import PostDetailBlogProfileSection from '@/features/post-detail/ui/PostDetailBlogProfileSection';
import PostDetailHeader from '@/features/post-detail/ui/PostDetailHeader';
import SeriesAccordionSection from '@/features/post-detail/ui/SeriesAccordionSection';
import { buildBlogHomePath } from '@/shared/routes/app-routes';
import CustomLink from '@/shared/ui/link/CustomLink';

import BasePostDetail from './BasePostDetail';

interface PostDetailProps {
	post: PostDetailModel;
}

export default function PostDetail({ post }: PostDetailProps) {
	const header = (
		<PostDetailHeader
			postId={post.id}
			slug={post.blog.slug}
			title={post.title}
			publishedAt={post.publishedAt}
			category={post.category}
			chapter={post.chapter}
			author={post.author}
			viewerPermissions={post.viewerPermissions}
		/>
	);
	const blogProfile = (
		<Suspense fallback={<PostDetailBlogProfile profile={post.blog} />}>
			<PostDetailBlogProfileSection blogSlug={post.blog.slug} />
		</Suspense>
	);

	if (post.blog.type === 'RILOG') {
		return (
			<BasePostDetail
				post={post}
				header={header}
				profileSection={blogProfile}
				beforeContent={
					post.chapter ? (
						<div className="mx-auto w-full max-w-[848px] px-5 sm:px-10">
							<Suspense
								fallback={
									<div
										role="status"
										aria-label="시리즈 로딩 중"
										className="mt-5 border-y border-border-strong px-5 py-3 text-body-3 text-text-secondary sm:mt-10"
									>
										<div className="h-7 w-50 animate-pulse rounded bg-surface-active sm:w-100" />
									</div>
								}
							>
								<SeriesAccordionSection slug={post.blog.slug} postId={post.id} chapter={post.chapter} />
							</Suspense>
						</div>
					) : null
				}
			/>
		);
	}

	const publisher = (
		<div className="mb-4 flex items-center gap-1 text-body-2 font-medium sm:mb-5">
			<CustomLink
				href={buildBlogHomePath(post.blog.slug)}
				className="flex items-center gap-1 text-text-primary hover:text-focus-ring focus:text-focus-ring active:text-focus-ring"
			>
				<CologAvatar
					src={post.blog.profileImageUrl || undefined}
					fallback={post.blog.name.slice(0, 1)}
					label={`${post.blog.name} 팀 로고`}
					size="sm"
				/>
				<span className="hover:underline hover:underline-offset-2">{post.blog.name}.</span>
			</CustomLink>
			<span className="text-text-placeholder">{post.chapter?.name}</span>
		</div>
	);

	return (
		<BasePostDetail
			post={post}
			header={
				<PostDetailHeader
					publisher={publisher}
					postId={post.id}
					slug={post.blog.slug}
					title={post.title}
					publishedAt={post.publishedAt}
					category={post.category}
					chapter={post.chapter}
					author={post.author}
					viewerPermissions={post.viewerPermissions}
				/>
			}
			profileSection={
				<>
					{blogProfile}
					<div className="mx-auto mt-6 w-fit min-w-20 border-t border-border-default px-6 pt-6 sm:min-w-100">
						<Suspense fallback={<PostDetailAuthorProfileSmall author={post.author} />}>
							<PostDetailAuthorProfileSection authorSlug={post.author.slug} />
						</Suspense>
					</div>
				</>
			}
			afterProfile={
				post.chapter ? (
					<div className="mt-20 sm:mt-24">
						<Suspense
							fallback={
								<div role="status" aria-label="챕터 게시글 추천 로딩 중">
									<div className="h-5 w-40 animate-pulse rounded bg-surface-active" />
									<div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
										{Array.from({ length: 3 }, (_, index) => (
											<div key={index} className="aspect-video animate-pulse rounded-xl bg-surface-active" />
										))}
									</div>
								</div>
							}
						>
							<ChapterPostSuggestionSection slug={post.blog.slug} chapter={post.chapter} currentPostId={post.id} />
						</Suspense>
					</div>
				) : null
			}
		/>
	);
}
