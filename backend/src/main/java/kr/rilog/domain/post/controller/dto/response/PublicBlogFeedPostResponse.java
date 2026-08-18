package kr.rilog.domain.post.controller.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.post.repository.projection.PostFullFeedRow;
import org.springframework.data.domain.Slice;

import java.time.LocalDateTime;
import java.util.List;

@Schema(description = "공개 블로그 게시글 목록 조회 응답")
public record PublicBlogFeedPostResponse(

        @Schema(description = "공개 블로그 타입", example = "COLOG")
        String type,

        @Schema(description = "게시글 목록")
        List<PostItemResponse> posts,

        @Schema(description = "현재 페이지", example = "0")
        int page,

        @Schema(description = "페이지 크기", example = "10")
        int size,

        @Schema(description = "현재 응답 게시글 수", example = "10")
        int numberOfElements,

        @Schema(description = "다음 페이지 존재 여부", example = "true")
        boolean hasNext
) {

    public static PublicBlogFeedPostResponse from(BlogType blogType, Slice<PostFullFeedRow> slice) {
        return new PublicBlogFeedPostResponse(
                blogType.name(),
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
