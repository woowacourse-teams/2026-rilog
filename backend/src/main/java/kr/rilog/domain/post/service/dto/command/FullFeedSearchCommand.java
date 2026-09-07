package kr.rilog.domain.post.service.dto.command;

import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.post.entity.enums.Category;

public record FullFeedSearchCommand(
        Category category,
        BlogType blogType,
        int page,
        int size
) {
}
