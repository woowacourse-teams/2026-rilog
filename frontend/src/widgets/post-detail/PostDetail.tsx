import { Suspense } from 'react';

import CologAvatar from '@/domains/blog/ui/CologAvatar';
import type { PostDetail as PostDetailModel } from '@/domains/post/model/post';
import ChapterPostSuggestionSection from '@/features/post-detail/ui/ChapterPostSuggestionSection';
import PostDetailAuthorProfileSmall from '@/features/post-detail/ui/PostDetailAuthorProfileSmall';
import PostDetailBlogProfile from '@/features/post-detail/ui/PostDetailBlogProfile';
import PostDetailBlogProfileSection from '@/features/post-detail/ui/PostDetailBlogProfileSection';
import PostDetailHeader from '@/features/post-detail/ui/PostDetailHeader';
import SeriesAccordion from '@/features/post-detail/ui/SeriesAccordion';
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
							<SeriesAccordion slug={post.blog.slug} postId={post.id} />
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
						<PostDetailAuthorProfileSmall author={post.author} />
					</div>
				</>
			}
			afterProfile={
				post.chapter ? (
					<div className="mt-20 sm:mt-24">
						<ChapterPostSuggestionSection slug={post.blog.slug} />
					</div>
				) : null
			}
		/>
	);
}
