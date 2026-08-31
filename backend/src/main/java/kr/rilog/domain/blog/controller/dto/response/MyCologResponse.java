package kr.rilog.domain.blog.controller.dto.response;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.chapter.controller.dto.response.ChapterResponse;
import kr.rilog.domain.chapter.entity.Chapter;

import java.util.List;

public record MyCologResponse(
        Long cologId,
        String slug,
        String name,
        String profileImageUrl,
        List<ChapterResponse> chapters
) {

    public static MyCologResponse of(Blog blog, List<Chapter> chapters) {
        return new MyCologResponse(
                blog.getId(),
                blog.getSlug(),
                blog.getName(),
                blog.getProfileImageUrl(),
                chapters.stream()
                        .map(ChapterResponse::from)
                        .toList()
        );
    }

}
