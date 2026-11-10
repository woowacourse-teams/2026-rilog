package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.controller.dto.response.MyCologResponse;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.result.BlogMemberResult;
import kr.rilog.domain.blog.service.dto.result.CologOverview;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class CologQueryService {

    private final BlogRepository blogRepository;
    private final BlogMemberRepository blogMemberRepository;
    private final ChapterRepository chapterRepository;

    public List<BlogMemberResult> getCologMembers(String slug) {
        Blog colog = getColog(slug);

        return blogMemberRepository.findAllWithUserByBlogIdAndStatus(colog.getId(), BlogMemberStatus.ACTIVE).stream()
                .map(BlogMemberResult::from)
                .sorted(Comparator.comparing(BlogMemberResult::nickname))
                .toList();
    }

    private Blog getColog(String slug) {
        return blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(slug), BlogType.COLOG)
                .orElseThrow(() -> new BlogException(BLOG_NOT_FOUND));
    }

    public List<MyCologResponse> getMyCologsOverview(Long requesterId) {
        List<Blog> cologs = blogRepository.findAllActiveCologsByUserId(requesterId);
        List<Chapter> chapters = findChaptersByCologs(cologs);

        return CologOverview.group(cologs, chapters).stream()
                .map(MyCologResponse::from)
                .toList();
    }

    private List<Chapter> findChaptersByCologs(List<Blog> cologs) {
        if (cologs.isEmpty()) {
            return List.of();
        }

        return chapterRepository.findAllByBlogIds(getCologIds(cologs));
    }

    private List<Long> getCologIds(List<Blog> cologs) {
        return cologs.stream()
                .map(Blog::getId)
                .toList();
    }

}
