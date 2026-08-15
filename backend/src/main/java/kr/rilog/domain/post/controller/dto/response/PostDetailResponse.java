package kr.rilog.domain.post.controller.dto.response;

import kr.rilog.domain.post.entity.Post;
import kr.rilog.domain.user.entity.User;
import tools.jackson.databind.JsonNode;

import java.time.LocalDateTime;

public record PostDetailResponse(
        String title,
        JsonNode content,
        LocalDateTime publishedAt,
        String thumbnailImageUrl,
        String category,
        AuthorResponse author
) {

    public static PostDetailResponse from(Post post) {
        return new PostDetailResponse(
                post.getTitle(),
                post.getContent(),
                post.getPublishedAt(),
                post.getThumbnailUrl(),
                post.getCategory().getName(),
                AuthorResponse.from(post.getUser())
        );
    }

    public record AuthorResponse(
            String nickname,
            Long userId,
            String slug,
            String profileImageUrl
    ) {

        private static AuthorResponse from(User user) {
            return new AuthorResponse(
                    user.getNickname(),
                    user.getId(),
                    user.getSlug(),
                    user.getProfileImageUrl()
            );
        }
    }
}
