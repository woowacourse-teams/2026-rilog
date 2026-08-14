package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.controller.dto.response.MyCologResponse;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BlogServiceTest {

    private static final Long REQUESTER_ID = 1L;

    @Mock
    private BlogRepository blogRepository;

    private BlogService blogService;

    @BeforeEach
    void setUp() {
        blogService = new BlogService(blogRepository);
    }

    @Test
    @DisplayName("나의 팀 목록을 조회하면 요청자가 활동 중인 팀을 조회한다")
    void getMyCologsPreviewFindsActiveCologsByRequesterId() {
        // given
        when(blogRepository.findAllActiveCologsByUserId(REQUESTER_ID))
                .thenReturn(List.of());

        // when
        blogService.getMyCologsPreview(REQUESTER_ID);

        // then
        verify(blogRepository).findAllActiveCologsByUserId(REQUESTER_ID);
    }

    @Test
    @DisplayName("나의 팀 목록 조회 결과에는 팀 식별자, 슬러그, 이름과 로고 URL이 순서대로 포함된다")
    void getMyCologsPreviewReturnsCologSummariesInRepositoryOrder() {
        // given
        Blog firstColog = createColog(2L, "study-2", "스터디 2", "https://example.com/study-2.png");
        Blog secondColog = createColog(1L, "study-1", "스터디 1", "https://example.com/study-1.png");
        when(blogRepository.findAllActiveCologsByUserId(REQUESTER_ID))
                .thenReturn(List.of(firstColog, secondColog));

        // when
        List<MyCologResponse> responses = blogService.getMyCologsPreview(REQUESTER_ID);

        // then
        assertThat(responses).containsExactly(
                new MyCologResponse(2L, "study-2", "스터디 2", "https://example.com/study-2.png"),
                new MyCologResponse(1L, "study-1", "스터디 1", "https://example.com/study-1.png")
        );
    }

    @Test
    @DisplayName("개인 블로그가 없으면 온보딩 완료 사용자 정보로 개인 블로그를 생성한다")
    void createRilogIfAbsentCreatesRilogFromCompletedUser() {
        // given
        User user = User.builder()
                .id(REQUESTER_ID)
                .githubId(100L)
                .nickname("러로")
                .slug("riro")
                .introduction("기록하는 개발자입니다.")
                .profileImageUrl("https://example.com/profile.png")
                .githubUrl("https://github.com/jinriro")
                .email("riro@example.com")
                .build();
        when(blogRepository.findRilogByOwnerId(REQUESTER_ID))
                .thenReturn(Optional.empty());

        // when
        blogService.createRilogIfAbsent(user);

        // then
        ArgumentCaptor<Blog> blogCaptor = ArgumentCaptor.forClass(Blog.class);
        verify(blogRepository).save(blogCaptor.capture());
        Blog savedBlog = blogCaptor.getValue();
        assertThat(savedBlog)
                .extracting(
                        Blog::getOwner,
                        Blog::getName,
                        Blog::getSlug,
                        Blog::getIntroduction,
                        Blog::getLogoUrl,
                        Blog::getGithubUrl,
                        Blog::getEmail,
                        Blog::getBlogType
                )
                .containsExactly(
                        user,
                        "러로",
                        "riro",
                        "기록하는 개발자입니다.",
                        "https://example.com/profile.png",
                        "https://github.com/jinriro",
                        "riro@example.com",
                        BlogType.RILOG
                );
    }

    @Test
    @DisplayName("이미 개인 블로그가 있으면 다시 생성하지 않는다")
    void createRilogIfAbsentDoesNotCreateRilogWhenAlreadyExists() {
        // given
        User user = User.builder()
                .id(REQUESTER_ID)
                .githubId(100L)
                .nickname("러로")
                .slug("riro")
                .build();
        when(blogRepository.findRilogByOwnerId(REQUESTER_ID))
                .thenReturn(Optional.of(createRilog(user)));

        // when
        blogService.createRilogIfAbsent(user);

        // then
        verify(blogRepository, never()).save(any(Blog.class));
    }

    private Blog createColog(Long id, String slug, String name, String logoUrl) {
        return Blog.builder()
                .id(id)
                .slug(slug)
                .name(name)
                .logoUrl(logoUrl)
                .blogType(BlogType.COLOG)
                .build();
    }

    private Blog createRilog(User owner) {
        return Blog.builder()
                .id(3L)
                .owner(owner)
                .slug(owner.getSlug())
                .name(owner.getNickname())
                .blogType(BlogType.RILOG)
                .build();
    }

}
