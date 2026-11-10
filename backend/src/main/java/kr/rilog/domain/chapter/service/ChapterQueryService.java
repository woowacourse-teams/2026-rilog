package kr.rilog.domain.chapter.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.entity.vo.ChaptersOfBlog;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.chapter.service.dto.result.ChapterResult;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class ChapterQueryService {

    private final BlogRepository blogRepository;
    private final ChapterRepository chapterRepository;

    public List<ChapterResult> readAll(String slug) { // NOTE 모든 챕터목록을 불러옴. 페이징 X
        Blog blog = getBlog(slug);
        ChaptersOfBlog chapters = ChaptersOfBlog.from(getChaptersOfBlog(blog));
        return chapters.getChaptersSortByOrder();
    }

    private List<Chapter> getChaptersOfBlog(Blog blog) {
        return chapterRepository.findAllByBlogIdAndDeletedAtIsNullOrderByOrderAsc(blog.getId());
    }

    private Blog getBlog(String slug) {
        return blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(slug))
                .orElseThrow(() -> new BlogException(BLOG_NOT_FOUND));
    }

}
