package kr.rilog.domain.post.repository.projection;

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

        Long authorId,
        String authorNickname,
        String authorSlug,
        String authorProfileImageUrl,

        Long cologId,
        String cologName,
        String cologSlug,
        String cologLogoUrl
) {

    public boolean isTeamPost() {
        return cologId != null;
    }

}
