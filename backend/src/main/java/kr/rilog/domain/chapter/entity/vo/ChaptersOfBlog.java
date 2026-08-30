package kr.rilog.domain.chapter.entity.vo;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.exception.ChapterException;
import kr.rilog.domain.chapter.service.dto.result.ChapterResult;

import java.util.Comparator;
import java.util.List;

import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NAME_ALREADY_EXISTS;

public record ChaptersOfBlog(List<Chapter> chapters) {

    public ChaptersOfBlog {
        chapters = List.copyOf(chapters);
    }

    public static ChaptersOfBlog from(List<Chapter> chapters) {
        return new ChaptersOfBlog(chapters);
    }

    public Chapter createNextChapter(Blog blog, String name) {
        ChapterName chapterName = ChapterName.from(name);
        validateUniqueName(chapterName);
        return Chapter.create(blog, chapterName.getValue(), chapters.size()); // NOTE order는 0-based
    }

    private void validateUniqueName(ChapterName name) {
        if (isDuplicatedName(name)) {
            throw new ChapterException(CHAPTER_NAME_ALREADY_EXISTS);
        }
    }

    private boolean isDuplicatedName(ChapterName name) {
        return chapters.stream()
                .anyMatch(chapter -> chapter.isSameName(name));
    }

    public List<ChapterResult> getChaptersSortByOrder() {
        return chapters.stream()
                .sorted(Comparator.comparingInt(Chapter::getOrder))
                .map(ChapterResult::from)
                .toList();
    }

}
