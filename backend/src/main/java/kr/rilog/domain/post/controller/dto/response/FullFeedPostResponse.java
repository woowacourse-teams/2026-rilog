package kr.rilog.domain.post.controller.dto.response;

import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.chapter.controller.dto.response.ChapterResponse;
import kr.rilog.domain.post.repository.projection.PostFullFeedRow;
import kr.rilog.domain.post.service.dto.result.FullFeedPostResult;
import org.springframework.data.domain.Slice;

import java.time.LocalDateTime;
import java.util.List;

public record FullFeedPostResponse(
        List<PostItemResponse> posts,
        int page,
        int size,
        int numberOfElements,
        boolean hasNext
) {

    public static FullFeedPostResponse from(Slice<PostFullFeedRow> slice) {
        return new FullFeedPostResponse(
                slice.getContent().stream()
                        .map(PostItemResponse::from)
                        .toList(),
                slice.getNumber(),
                slice.getSize(),
                slice.getNumberOfElements(),
                slice.hasNext()
        );
    }

    public static FullFeedPostResponse from(FullFeedPostResult result) {
        return new FullFeedPostResponse(
                result.posts().stream()
                        .map(PostItemResponse::from)
                        .toList(),
                result.page(),
                result.size(),
                result.numberOfElements(),
                result.hasNext()
        );
    }

    public record PostItemResponse(
            Long postId,
            String title,
            String thumbnailImageUrl,
            String category,
            String visibility,
            LocalDateTime publishedAt,
            long totalCommentsCount,
            ChapterResponse chapter,
            AuthorResponse author,
            OwnerResponse owner
    ) {

        private static PostItemResponse from(PostFullFeedRow row) {
            return new PostItemResponse(
                    row.postId(),
                    row.title(),
                    row.thumbnailImageUrl(),
                    row.category().getName(),
                    row.visibility().name(),
                    row.publishedAt(),
                    row.inlineCommentCount(),
                    ChapterResponse.from(row.chapterId(), row.chapterName(), row.chapterOrder()),
                    new AuthorResponse(
                            row.authorId(),
                            row.authorNickname(),
                            row.authorSlug(),
                            row.authorProfileImageUrl()
                    ),
                    new OwnerResponse(
                            row.ownerType(),
                            row.ownerId(),
                            row.ownerSlug(),
                            row.ownerName(),
                            row.ownerProfileImageUrl()
                    )
            );
        }

        private static PostItemResponse from(FullFeedPostResult.PostItemResult result) {
            return new PostItemResponse(
                    result.postId(),
                    result.title(),
                    result.thumbnailImageUrl(),
                    result.category().getName(),
                    result.visibility().name(),
                    result.publishedAt(),
                    result.totalCommentsCount(),
                    ChapterResponse.from(
                            result.chapterId(),
                            result.chapterName(),
                            result.chapterOrder()
                    ),
                    new AuthorResponse(
                            result.authorId(),
                            result.authorNickname(),
                            result.authorSlug(),
                            result.authorProfileImageUrl()
                    ),
                    new OwnerResponse(
                            result.ownerType(),
                            result.ownerId(),
                            result.ownerSlug(),
                            result.ownerName(),
                            result.ownerProfileImageUrl()
                    )
            );
        }
    }

    public record AuthorResponse(
            Long userId,
            String nickname,
            String slug,
            String profileImageUrl
    ) {
    }

    public record OwnerResponse(
            BlogType type,
            Long blogId,
            String slug,
            String name,
            String profileImageUrl
    ) {
    }

}
