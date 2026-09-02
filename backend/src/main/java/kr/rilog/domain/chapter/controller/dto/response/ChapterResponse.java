package kr.rilog.domain.chapter.controller.dto.response;

import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.service.dto.result.ChapterResult;

public record ChapterResponse(
        Long chapterId,
        String name,
        int order
) {

    public static ChapterResponse from(ChapterResult result) {
        return new ChapterResponse(result.chapterId(), result.name(), result.order());
    }

    public static ChapterResponse from(Chapter chapter) {
        if (chapter == null) {
            return null;
        }
        return new ChapterResponse(chapter.getId(), chapter.getName(), chapter.getOrder());
    }

    public static ChapterResponse from(Long chapterId, String name, Integer order) {
        if (chapterId == null) {
            return null;
        }
        return new ChapterResponse(chapterId, name, order);
    }

}
