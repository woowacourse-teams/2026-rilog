package kr.rilog.domain.chapter.controller.dto.response;

import kr.rilog.domain.chapter.service.dto.result.ChapterResult;

public record ChapterResponse(
        Long chapterId,
        String name,
        int order
) {

    public static ChapterResponse from(ChapterResult result) {
        return new ChapterResponse(result.chapterId(), result.name(), result.order());
    }
}
