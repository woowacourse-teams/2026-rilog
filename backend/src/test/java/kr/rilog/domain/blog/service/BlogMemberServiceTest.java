package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.result.BlogMemberResult;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.entity.vo.Nickname;
import kr.rilog.domain.blog.entity.Slug;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BlogMemberServiceTest {

    private static final String ERROR_INFORMATION = "errorInformation";
    private static final Long COLOG_ID = 2L;
    private static final String COLOG_SLUG = "rilog-team";

    @Mock
    private BlogRepository blogRepository;

    @Mock
    private BlogMemberRepository blogMemberRepository;

    private BlogMemberService blogMemberService;

    @BeforeEach
    void setUp() {
        blogMemberService = new BlogMemberService(blogRepository, blogMemberRepository);
    }

    @Test
    @DisplayName("팀 멤버 목록 조회는 slug로 팀을 찾고 ACTIVE 멤버 목록을 반환한다")
    void getCologMembersReturnsActiveMembers() {
        // given
        Blog colog = createColog();
        BlogMember ownerMember = createMember(
                1L,
                createUser(10L, "리로", "jinriro", "https://example.com/profile.png"),
                BlogPermission.OWNER,
                "Backend",
                LocalDateTime.of(2026, 8, 13, 12, 0)
        );
        BlogMember member = createMember(
                2L,
                createUser(11L, "포비", "pobi", "https://example.com/pobi.png"),
                BlogPermission.MEMBER,
                "Frontend",
                LocalDateTime.of(2026, 8, 13, 13, 0)
        );
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG)).thenReturn(Optional.of(colog));
        when(blogMemberRepository.findAllWithUserByBlogIdAndStatus(COLOG_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(List.of(ownerMember, member));

        // when
        List<BlogMemberResult> results = blogMemberService.getCologMembers(COLOG_SLUG);

        // then
        assertThat(results).containsExactly(
                new BlogMemberResult(
                        1L,
                        10L,
                        "리로",
                        "jinriro",
                        "https://example.com/profile.png",
                        BlogPermission.OWNER,
                        "Backend",
                        LocalDateTime.of(2026, 8, 13, 12, 0)
                ),
                new BlogMemberResult(
                        2L,
                        11L,
                        "포비",
                        "pobi",
                        "https://example.com/pobi.png",
                        BlogPermission.MEMBER,
                        "Frontend",
                        LocalDateTime.of(2026, 8, 13, 13, 0)
                )
        );
        verify(blogMemberRepository).findAllWithUserByBlogIdAndStatus(COLOG_ID, BlogMemberStatus.ACTIVE);
    }

    @Test
    @DisplayName("팀 slug가 존재하지 않으면 멤버 목록 조회를 거부한다")
    void getCologMembersRejectsMissingColog() {
        // given
        when(blogRepository.findBySlugAndBlogTypeAndDeletedAtIsNull(Slug.from(COLOG_SLUG), BlogType.COLOG)).thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> blogMemberService.getCologMembers(COLOG_SLUG))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_NOT_FOUND);
    }

    private Blog createColog() {
        return Blog.builder()
                .id(COLOG_ID)
                .slug(Slug.from(COLOG_SLUG))
                .name("리로그 팀")
                .blogType(BlogType.COLOG)
                .build();
    }

    private BlogMember createMember(
            Long id,
            User user,
            BlogPermission permission,
            String blogRole,
            LocalDateTime joinedAt
    ) {
        return BlogMember.builder()
                .id(id)
                .blog(createColog())
                .user(user)
                .permission(permission)
                .blogRole(blogRole)
                .status(BlogMemberStatus.ACTIVE)
                .joinedAt(joinedAt)
                .build();
    }

    private User createUser(Long id, String nickname, String slug, String profileImageUrl) {
        return User.builder()
                .id(id)
                .nickname(Nickname.from(nickname))
                .slug(Slug.from(slug))
                .profileImageUrl(profileImageUrl)
                .githubId(id * 100)
                .build();
    }

}
