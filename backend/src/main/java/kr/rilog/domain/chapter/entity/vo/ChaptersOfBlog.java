package kr.rilog.domain.chapter.entity.vo;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.exception.ChapterException;
import kr.rilog.domain.chapter.service.dto.result.ChapterResult;

import java.util.Comparator;
import java.util.List;
import java.util.Objects;

import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NAME_ALREADY_EXISTS;
import static kr.rilog.domain.chapter.exception.ChapterErrorInformation.CHAPTER_NOT_FOUND;

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

    public void validateUniqueNameExceptId(Long chapterId, ChapterName name) {
        boolean duplicatedName = isDuplicatedNameExceptedId(chapterId, name);
        if (duplicatedName) {
            throw new ChapterException(CHAPTER_NAME_ALREADY_EXISTS);
        }
    }

    private boolean isDuplicatedNameExceptedId(Long chapterId, ChapterName name) {
        return chapters.stream()
                .filter(chapter -> !Objects.equals(chapter.getId(), chapterId))
                .anyMatch(chapter -> chapter.isSameName(name));
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

    public Chapter getChapter(Long chapterId) {
        return chapters.stream()
                .filter(chapter -> chapter.getId().equals(chapterId))
                .findFirst()
                .orElseThrow(() -> new ChapterException(CHAPTER_NOT_FOUND));
    }

}
