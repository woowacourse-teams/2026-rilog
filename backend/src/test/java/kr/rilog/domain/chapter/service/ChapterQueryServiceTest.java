package kr.rilog.domain.chapter.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.entity.Chapter;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.chapter.service.dto.result.ChapterResult;
import kr.rilog.support.fixure.BlogFixture;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Optional;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ChapterQueryServiceTest {

    @Test
    @DisplayName("존재하지 않는 블로그의 챕터 목록을 조회하면 예외가 발생한다.")
    void readAllRejectsMissingBlog() {
        // given
        BlogRepository blogRepository = mock(BlogRepository.class);
        ChapterRepository chapterRepository = mock(ChapterRepository.class);
        ChapterQueryService chapterQueryService = new ChapterQueryService(blogRepository, chapterRepository);
        String slug = "missing_blog";
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(slug))).thenReturn(Optional.empty());

        // when
        Throwable thrown = catchThrowable(() -> chapterQueryService.readAll(slug));

        // then
        assertThat(thrown)
                .isInstanceOf(BlogException.class)
                .hasMessage(BLOG_NOT_FOUND.getMessage());
        verifyNoInteractions(chapterRepository);
    }

    @Test
    @DisplayName("활성 챕터를 순서대로 응답 DTO로 변환한다.")
    void readAllMapsChaptersInOrder() {
        // given
        BlogRepository blogRepository = mock(BlogRepository.class);
        ChapterRepository chapterRepository = mock(ChapterRepository.class);
        ChapterQueryService chapterQueryService = new ChapterQueryService(blogRepository, chapterRepository);
        String slug = "team_blog";
        Blog blog = Blog.createColog(UserFixture.pending(), slug, BlogFixture.cologProfile());
        Chapter first = Chapter.create(blog, "첫 번째", 0);
        Chapter second = Chapter.create(blog, "두 번째", 1);
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from(slug))).thenReturn(Optional.of(blog));
        when(chapterRepository.findAllByBlogIdAndDeletedAtIsNullOrderByOrderAsc(blog.getId()))
                .thenReturn(List.of(second, first));

        // when
        List<ChapterResult> chapters = chapterQueryService.readAll(slug);

        // then
        assertThat(chapters).containsExactly(ChapterResult.from(first), ChapterResult.from(second));
    }
}
