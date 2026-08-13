package kr.rilog.domain.post.controller.dto.response;

import kr.rilog.domain.post.repository.projection.TeamFeedPostRow;
import org.springframework.data.domain.Slice;

import java.time.LocalDateTime;
import java.util.List;

public record TeamFeedPostResponse(
        List<PostItemResponse> posts,
        int page,
        int size,
        int numberOfElements,
        boolean hasNext
) {

    public static TeamFeedPostResponse from(Slice<TeamFeedPostRow> slice) {
        return new TeamFeedPostResponse(
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
            String status,
            String visibility,
            LocalDateTime publishedAt,
            UserResponse user
    ) {
        private static PostItemResponse from(TeamFeedPostRow row) {
            return new PostItemResponse(
                    row.postId(),
                    row.title(),
                    row.thumbnailUrl(),
                    row.category().getName(),
                    row.status().name(),
                    row.visibility().name(),
                    row.publishedAt(),
                    new UserResponse(
                            row.nickname(),
                            row.userId(),
                            row.userSlug(),
                            row.profileImageUrl()
                    )
            );
        }
    }

    public record UserResponse(
            String nickname,
            Long userId,
            String slug,
            String profileImageUrl
    ) {
    }

}
