package kr.rilog.domain.chapter.repository.projection;

public record ChapterIndexProjection(
        Long chapterId,
        String chapterName,
        long postCount
) {
}
