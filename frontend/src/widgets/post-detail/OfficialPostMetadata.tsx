import type { PostDetail } from '@/domains/post/model/post';
import Avatar from '@/shared/ui/avatar/Avatar';
import { getImageUrl } from '@/shared/utils/get-image-url';

interface OfficialPostMetadataProps {
	post: Pick<PostDetail, 'postType' | 'description' | 'source'>;
}

export default function OfficialPostMetadata({ post }: OfficialPostMetadataProps) {
	if (post.postType === 'STANDARD' || (!post.description && !post.source)) return null;

	return (
		<section aria-label="공식 콘텐츠 정보" className="mx-auto mb-8 w-full max-w-3xl px-5 sm:mb-10 sm:px-8 lg:px-0">
			{post.description ? (
				<p className="text-center text-body-3 [overflow-wrap:anywhere] break-keep text-text-secondary">
					{post.description}
				</p>
			) : null}
			{post.source ? (
				<div className="mt-4 flex items-center justify-center gap-2 text-body-3 text-text-secondary">
					<span>출처</span>
					<Avatar
						src={getImageUrl(post.source.profileImageUrl) || undefined}
						fallback={post.source.name.slice(0, 1)}
						label={`${post.source.name} 출처 이미지`}
						className="size-6 rounded-full bg-surface-active text-caption-2"
					/>
					<span>{post.source.name}</span>
				</div>
			) : null}
		</section>
	);
}
