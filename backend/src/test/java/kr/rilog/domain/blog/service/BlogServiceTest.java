package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.controller.dto.response.MyCologResponse;
import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.result.CologPublicProfileResult;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.entity.vo.Nickname;
import kr.rilog.global.vo.Slug;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BlogServiceTest {

    private static final String ERROR_INFORMATION = "errorInformation";
    private static final Long REQUESTER_ID = 1L;
    private static final Long COLOG_ID = 2L;

    @Mock
    private BlogRepository blogRepository;

    @Mock
    private BlogMemberRepository blogMemberRepository;

    @Mock
    private PostRepository postRepository;

    private BlogService blogService;

    @BeforeEach
    void setUp() {
        blogService = new BlogService(blogRepository, blogMemberRepository, postRepository);
    }

    @Test
    @DisplayName("팀 slug로 공개 프로필 정보를 조회한다")
    void getPublicProfileFindsCologBySlug() {
        // given
        User owner = createCompletedOwner();
        Blog colog = createDetailedColog(owner);
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull("rilog-team", BlogType.COLOG)).thenReturn(Optional.of(colog));
        when(blogMemberRepository.countActiveMembersByBlogId(COLOG_ID)).thenReturn(10L);
        when(postRepository.countPublicPublishedPostsByCologId(COLOG_ID)).thenReturn(24L);

        // when
        CologPublicProfileResult result = blogService.getPublicProfile("rilog-team");

        // then
        assertThat(result)
                .extracting(
                        CologPublicProfileResult::id,
                        CologPublicProfileResult::name,
                        CologPublicProfileResult::slug,
                        CologPublicProfileResult::introduction,
                        CologPublicProfileResult::profileImageUrl,
                        CologPublicProfileResult::coverImageUrl,
                        CologPublicProfileResult::serviceUrl,
                        CologPublicProfileResult::githubUrl,
                        CologPublicProfileResult::memberCount,
                        CologPublicProfileResult::postCount
                )
                .containsExactly(
                        COLOG_ID,
                        "리로그 팀",
                        "rilog-team",
                        "함께 쓰는 기술 블로그",
                        "https://example.com/logo.png",
                        "https://example.com/cover.png",
                        "https://rilog.example.com",
                        "https://github.com/rilog",
                        10L,
                        24L
                );
        verify(blogMemberRepository).countActiveMembersByBlogId(COLOG_ID);
        verify(postRepository).countPublicPublishedPostsByCologId(COLOG_ID);
    }

    @Test
    @DisplayName("팀 slug에 해당하는 COLOG가 없으면 공개 프로필 조회를 거부한다")
    void getPublicProfileRejectsMissingColog() {
        // given
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull("unknown-team", BlogType.COLOG)).thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> blogService.getPublicProfile("unknown-team"))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_NOT_FOUND);
        verify(blogMemberRepository, never()).countActiveMembersByBlogId(COLOG_ID);
        verify(postRepository, never()).countPublicPublishedPostsByCologId(COLOG_ID);
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

    private Blog createColog(Long id, String slug, String name, String logoUrl) {
        return Blog.builder()
                .id(id)
                .slug(slug)
                .name(name)
                .profileImageUrl(logoUrl)
                .blogType(BlogType.COLOG)
                .build();
    }

    private Blog createDetailedColog(User owner) {
        return Blog.builder()
                .id(COLOG_ID)
                .owner(owner)
                .name("리로그 팀")
                .slug("rilog-team")
                .introduction("함께 쓰는 기술 블로그")
                .profileImageUrl("https://example.com/logo.png")
                .coverImageUrl("https://example.com/cover.png")
                .serviceUrl("https://rilog.example.com")
                .githubUrl("https://github.com/rilog")
                .blogType(BlogType.COLOG)
                .build();
    }

    private User createCompletedOwner() {
        return User.builder()
                .id(REQUESTER_ID)
                .nickname(Nickname.from("러로"))
                .slug(Slug.from("riro"))
                .build();
    }

}
