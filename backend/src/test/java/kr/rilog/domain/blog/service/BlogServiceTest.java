package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.result.CologPublicProfileResult;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.entity.vo.Nickname;
import kr.rilog.domain.blog.entity.vo.Slug;
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
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from("team_Rilog"), BlogType.COLOG)).thenReturn(Optional.of(colog));
        when(blogMemberRepository.countActiveMembersByBlogId(COLOG_ID)).thenReturn(10L);
        when(postRepository.countPublicPublishedPostsByCologId(COLOG_ID)).thenReturn(24L);

        // when
        CologPublicProfileResult result = blogService.getPublicProfile("team_Rilog");

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
                        "리로그",
                        "team_rilog",
                        "세계 최고의 블로그 플랫폼 Rilog. 입니다.",
                        "https://example.com/profile.png",
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
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from("unknown-team"), BlogType.COLOG)).thenReturn(Optional.empty());

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

    private Blog createColog(Long id) {
        return Blog.builder()
                .id(id)
                .slug(Slug.from("team_rilog"))
                .profile(createCologProfile())
                .blogType(BlogType.COLOG)
                .build();
    }

    private Blog createDetailedColog(User owner) {
        return Blog.builder()
                .id(COLOG_ID)
                .owner(owner)
                .slug(Slug.from("team_rilog"))
                .profile(createCologProfile())
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

    private Profile createRilogProfile() {
        return Profile.createColog(
                "러로",
                "안녕하세요. 러로입니다. ",
                "https://example.com/profile.png",
                "https://example.com/cover.png",
                "https://jinriro.example.com",
                "https://github.com/Wlsflfh"
        );
    }

    private Profile createCologProfile() {
        return Profile.createColog(
                "리로그",
                "세계 최고의 블로그 플랫폼 Rilog. 입니다.",
                "https://example.com/profile.png",
                "https://example.com/cover.png",
                "https://rilog.example.com",
                "https://github.com/rilog"
        );
    }

}
