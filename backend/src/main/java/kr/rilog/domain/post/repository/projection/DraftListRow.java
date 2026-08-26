package kr.rilog.domain.post.repository.projection;

import java.time.LocalDateTime;

public record DraftListRow(
        Long draftId,
        String title,
        LocalDateTime publishedAt
) {
}
