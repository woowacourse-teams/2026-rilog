package kr.rilog.domain.chapter.service.dto.result;

import kr.rilog.domain.chapter.entity.Chapter;

public record ChapterResult(
        Long chapterId,
        String name,
        int order
) {

    public static ChapterResult from(Chapter chapter) {
        return new ChapterResult(chapter.getId(), chapter.getName(), chapter.getOrder());
    }
}
