package kr.rilog.domain.post.controller.dto.response;

import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.post.repository.projection.PostFullFeedRow;
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

    public record PostItemResponse(
            Long postId,
            String title,
            String thumbnailImageUrl,
            String category,
            String visibility,
            LocalDateTime publishedAt,
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
