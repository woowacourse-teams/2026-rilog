package kr.rilog.domain.blog.service.dto.result;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.chapter.entity.Chapter;

import java.util.List;
import java.util.Map;

import static java.util.stream.Collectors.groupingBy;

public record CologOverview(
        Blog colog,
        List<Chapter> chapters
) {

    public static List<CologOverview> group(List<Blog> cologs, List<Chapter> chapters) {
        Map<Long, List<Chapter>> chaptersByCologId = chapters.stream()
                .collect(groupingBy(chapter -> chapter.getBlog().getId()));

        return cologs.stream()
                .map(colog -> new CologOverview(
                        colog,
                        chaptersByCologId.getOrDefault(colog.getId(), List.of())
                ))
                .toList();
    }

}
