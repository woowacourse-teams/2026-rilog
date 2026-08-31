package kr.rilog.domain.post.repository.projection;

import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.post.entity.enums.Category;
import kr.rilog.domain.post.entity.enums.PostVisibility;

import java.time.LocalDateTime;

public record PostFullFeedRow(
        Long postId,
        String title,
        String thumbnailImageUrl,
        Category category,
        PostVisibility visibility,
        LocalDateTime publishedAt,

        Long chapterId,
        String chapterName,
        Integer chapterOrder,

        Long authorId,
        String authorNickname,
        String authorSlug,
        String authorProfileImageUrl,

        BlogType ownerType,
        Long ownerId,
        String ownerSlug,
        String ownerName,
        String ownerProfileImageUrl
) {
}
