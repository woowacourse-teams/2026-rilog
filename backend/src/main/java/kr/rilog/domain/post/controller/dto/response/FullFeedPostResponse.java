package kr.rilog.domain.post.controller.dto.response;

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
            String thumbnailUrl,
            String category,
            String visibility,
            LocalDateTime publishedAt,
            AuthorResponse user,
            BlogResponse blog
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
                    row.isTeamPost()
                            ? new BlogResponse(
                            row.blogId(),
                            row.name(),
                            row.slug(),
                            row.profileUrl()
                    )
                            : null
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

    public record BlogResponse(
            Long blogId,
            String name,
            String slug,
            String profileUrl
    ) {
    }

}
