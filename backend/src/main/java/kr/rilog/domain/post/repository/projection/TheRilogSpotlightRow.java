package kr.rilog.domain.post.repository.projection;

import kr.rilog.domain.post.entity.enums.PostType;
import kr.rilog.domain.post.entity.vo.PostSource;

import java.time.LocalDateTime;

public record TheRilogSpotlightRow(
        Long postId,
        PostType postType,
        String title,
        String description,
        String thumbnailImageUrl,
        LocalDateTime publishedAt,
        PostSource source
) {
}
