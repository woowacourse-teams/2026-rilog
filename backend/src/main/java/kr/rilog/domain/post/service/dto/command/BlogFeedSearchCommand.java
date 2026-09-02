package kr.rilog.domain.post.service.dto.command;

import kr.rilog.domain.post.entity.enums.Category;

public record BlogFeedSearchCommand(
        Category category,
        Long chapterId,
        String targetCologSlug,
        int page,
        int size
) {

    public boolean hasTargetCologFilter() {
        return targetCologSlug != null;
    }

    public boolean hasChapterFilter() {
        return chapterId != null;
    }
}
