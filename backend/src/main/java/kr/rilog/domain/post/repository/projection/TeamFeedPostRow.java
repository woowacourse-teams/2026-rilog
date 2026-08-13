package kr.rilog.domain.post.repository.projection;

import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostStatus;
import kr.rilog.domain.post.entity.enums.PostVisibility;

import java.time.LocalDateTime;

public record TeamFeedPostRow(
        Long postId,
        String title,
        String thumbnailUrl,
        Category category,
        PostStatus status,
        PostVisibility visibility,
        LocalDateTime publishedAt,

        Long userId,
        String nickname,
        String userSlug,
        String profileImageUrl
) {
}
