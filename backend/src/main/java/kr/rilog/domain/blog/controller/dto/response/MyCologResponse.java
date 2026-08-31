package kr.rilog.domain.blog.controller.dto.response;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.service.dto.result.CologOverview;
import kr.rilog.domain.chapter.controller.dto.response.ChapterResponse;

import java.util.List;

public record MyCologResponse(
        Long cologId,
        String slug,
        String name,
        String profileImageUrl,
        List<ChapterResponse> chapters
) {

    public static MyCologResponse from(CologOverview overview) {
        Blog colog = overview.colog();
        return new MyCologResponse(
                colog.getId(),
                colog.getSlug(),
                colog.getName(),
                colog.getProfileImageUrl(),
                overview.chapters().stream()
                        .map(ChapterResponse::from)
                        .toList()
        );
    }

}
