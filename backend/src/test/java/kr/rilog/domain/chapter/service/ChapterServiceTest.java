package kr.rilog.domain.chapter.service;

import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

class ChapterServiceTest {

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
}
