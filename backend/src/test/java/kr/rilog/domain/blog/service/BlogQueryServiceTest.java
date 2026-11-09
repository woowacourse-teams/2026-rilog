package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.repository.PostRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_PROFILE_NAME_ALREADY_EXISTS;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_SLUG_ALREADY_EXISTS;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BlogQueryServiceTest {

    private static final String ERROR_INFORMATION = "errorInformation";

    @Mock
    private BlogRepository blogRepository;

    @Mock
    private PostRepository postRepository;

    @Mock
    private ChapterRepository chapterRepository;

    private BlogQueryService blogQueryService;

    @BeforeEach
    void setUp() {
        blogQueryService = new BlogQueryService(blogRepository, postRepository, chapterRepository);
    }

    @Test
    @DisplayName("중복되지 않은 블로그 슬러그는 검증을 통과한다")
    void validateDuplicatedSlugPassesWhenBlogSlugDoesNotExist() {
        // given
        Slug slug = Slug.from("ri_log_01");
        when(blogRepository.existsBySlug(slug)).thenReturn(false);

        // when - then
        assertThatCode(() -> blogQueryService.validateDuplicatedSlug(slug.getValue()))
                .doesNotThrowAnyException();
        verify(blogRepository).existsBySlug(slug);
    }

    @Test
    @DisplayName("중복된 블로그 슬러그이면 예외가 발생한다")
    void validateDuplicatedSlugThrowsWhenBlogSlugExists() {
        // given
        Slug slug = Slug.from("ri_log_01");
        when(blogRepository.existsBySlug(slug)).thenReturn(true);

        // when - then
        assertThatThrownBy(() -> blogQueryService.validateDuplicatedSlug(slug.getValue()))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_SLUG_ALREADY_EXISTS);
        verify(blogRepository).existsBySlug(slug);
    }

    @Test
    @DisplayName("중복되지 않은 블로그 프로필 이름은 검증을 통과한다")
    void validateDuplicatedProfileNamePassesWhenProfileNameDoesNotExist() {
        // given
        String profileName = "러로";
        when(blogRepository.existsByProfileName(profileName)).thenReturn(false);

        // when - then
        assertThatCode(() -> blogQueryService.validateDuplicatedProfileName(profileName))
                .doesNotThrowAnyException();
        verify(blogRepository).existsByProfileName(profileName);
    }

    @Test
    @DisplayName("중복된 블로그 프로필 이름이면 예외가 발생한다")
    void validateDuplicatedProfileNameThrowsWhenProfileNameExists() {
        // given
        String profileName = "러로";
        when(blogRepository.existsByProfileName(profileName)).thenReturn(true);

        // when - then
        assertThatThrownBy(() -> blogQueryService.validateDuplicatedProfileName(profileName))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_PROFILE_NAME_ALREADY_EXISTS);
        verify(blogRepository).existsByProfileName(profileName);
    }

    @Test
    @DisplayName("slug에 해당하는 블로그가 없으면 공개 프로필 조회를 거부한다")
    void getPublicProfileRejectsMissingColog() {
        // given
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from("unknown_team"))).thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> blogQueryService.getPublicProfile("unknown_team"))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_NOT_FOUND);
    }

}
