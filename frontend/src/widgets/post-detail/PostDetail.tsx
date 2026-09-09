import type { PostDetail as PostDetailModel } from '@/domains/post/model/post';
import ChapterPostSuggestionSection from '@/features/post-detail/ui/ChapterPostSuggestionSection';
import PostDetailAuthorProfileSmall from '@/features/post-detail/ui/PostDetailAuthorProfileSmall';
import PostDetailBlogProfile from '@/features/post-detail/ui/PostDetailBlogProfile';
import PostDetailHeader from '@/features/post-detail/ui/PostDetailHeader';
import SeriesAccordion from '@/features/post-detail/ui/SeriesAccordion';

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
	const blogProfile = <PostDetailBlogProfile profile={post.blog} />;

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

	return (
		<BasePostDetail
			post={post}
			header={header}
			profileSection={
				<>
					{blogProfile}
					<div className="mx-auto mt-6 w-fit min-w-20 border-t border-border-default px-6 pt-6 sm:min-w-100">
						<PostDetailAuthorProfileSmall author={post.author} />
					</div>
				</>
			}
			afterProfile={post.chapter ? <ChapterPostSuggestionSection slug={post.blog.slug} /> : null}
		/>
	);
}
