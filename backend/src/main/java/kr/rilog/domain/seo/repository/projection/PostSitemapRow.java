package kr.rilog.domain.seo.repository.projection;

import java.time.LocalDateTime;

public record PostSitemapRow(
        String blogSlug,
        Long postId,
        LocalDateTime lastModifiedAt
) {
}
