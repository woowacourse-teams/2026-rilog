package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.command.BlogProfileUpdateCommand;
import kr.rilog.domain.upload.domain.vo.TagAssets;
import kr.rilog.domain.upload.service.TagAssetsPublisher;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.entity.vo.Email;
import kr.rilog.domain.user.entity.vo.Nickname;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;
import java.util.Set;

import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_PROFILE_NAME_ALREADY_EXISTS;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_POST_PUBLISH_FORBIDDEN;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.AssertionsForClassTypes.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BlogCommandServiceTest {

    private static final String ERROR_INFORMATION = "errorInformation";
    private static final Long REQUESTER_ID = 1L;
    private static final Long COLOG_ID = 2L;
    private static final Long RILOG_ID = 3L;

    @Mock
    private BlogRepository blogRepository;

    @Mock
    private BlogMemberRepository blogMemberRepository;

    @Mock
    private TagAssetsPublisher tagAssetsPublisher;

    private BlogCommandService blogCommandService;

    @BeforeEach
    void setUp() {
        blogCommandService = new BlogCommandService(blogRepository, blogMemberRepository, tagAssetsPublisher);
    }

    @Test
    @DisplayName("COLOG 프로필 변경 시 현재 사용 중인 이름은 중복 검사에서 제외한다")
    void changeBlogProfileForCologValidatesDuplicateProfileNameExceptSelf() {
        // given
        User admin = createCompletedOwner();
        Blog colog = createDetailedColog(admin);
        BlogMember requesterMember = createMember(colog, admin, BlogPermission.ADMIN);
        BlogProfileUpdateCommand command = updateCommand("새 리로그 팀");
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from("team_Rilog"))).thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatus(COLOG_ID, REQUESTER_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(Optional.of(requesterMember));
        when(blogRepository.existsByProfileNameExceptId(command.name(), COLOG_ID)).thenReturn(false);

        // when & then
        assertThatCode(() -> blogCommandService.changeBlogProfile(REQUESTER_ID, "team_Rilog", command))
                .doesNotThrowAnyException();
        verify(blogRepository).existsByProfileNameExceptId(command.name(), COLOG_ID);
    }

    @Test
    @DisplayName("COLOG 프로필 변경 시 다른 블로그 이름과 중복되면 변경을 거부한다")
    void changeBlogProfileForCologRejectsDuplicateProfileName() {
        // given
        User admin = createCompletedOwner();
        Blog colog = createDetailedColog(admin);
        BlogMember requesterMember = createMember(colog, admin, BlogPermission.ADMIN);
        BlogProfileUpdateCommand command = updateCommand("중복 팀");
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from("team_Rilog"))).thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatus(COLOG_ID, REQUESTER_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(Optional.of(requesterMember));
        when(blogRepository.existsByProfileNameExceptId(command.name(), COLOG_ID)).thenReturn(true);

        // when & then
        assertThatThrownBy(() -> blogCommandService.changeBlogProfile(REQUESTER_ID, "team_Rilog", command))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_PROFILE_NAME_ALREADY_EXISTS);
        assertThat(colog.getName()).isEqualTo("리로그");
    }

    @Test
    @DisplayName("RILOG 프로필 변경 시 현재 사용 중인 이름은 중복 검사에서 제외한다")
    void changeBlogProfileForRilogAllowsOwner() {
        // given
        User owner = createCompletedOwner();
        Blog rilog = createDetailedRilog(owner);
        BlogProfileUpdateCommand command = updateCommand("새 개인 블로그");
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from("riro"))).thenReturn(Optional.of(rilog));
        when(blogRepository.existsByProfileNameExceptId(command.name(), RILOG_ID)).thenReturn(false);

        // when & then
        assertThatCode(() -> blogCommandService.changeBlogProfile(REQUESTER_ID, "riro", command))
                .doesNotThrowAnyException();
        verify(blogRepository).existsByProfileNameExceptId(command.name(), RILOG_ID);
    }

    @Test
    @DisplayName("블로그 프로필을 변경하면 이전 이미지와 현재 이미지의 synchronize 요청한다.")
    void changeBlogProfileSynchronizesTagAssets() {
        // given
        User admin = createCompletedOwner();
        Blog colog = createDetailedColog(admin);
        BlogMember requesterMember = createMember(colog, admin, BlogPermission.ADMIN);
        BlogProfileUpdateCommand command = updateCommand("새 리로그 팀");
        TagAssets previous = colog.getTagAssets();
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from("team_Rilog"))).thenReturn(Optional.of(colog));
        when(blogMemberRepository.findByBlogIdAndUserIdAndStatus(COLOG_ID, REQUESTER_ID, BlogMemberStatus.ACTIVE))
                .thenReturn(Optional.of(requesterMember));
        when(blogRepository.existsByProfileNameExceptId(command.name(), COLOG_ID)).thenReturn(false);

        // when
        blogCommandService.changeBlogProfile(REQUESTER_ID, "team_Rilog", command);

        // then
        verify(tagAssetsPublisher).synchronize(
                REQUESTER_ID,
                previous,
                new TagAssets(Set.of(command.profileImageUrl(), command.coverImageUrl()))
        );
    }

    @Test
    @DisplayName("RILOG 소유자가 아니면 개인 프로필 변경을 거부한다")
    void changeBlogProfileForRilogRejectsNonOwner() {
        // given
        User owner = createCompletedOwner();
        Blog rilog = createDetailedRilog(owner);
        BlogProfileUpdateCommand command = updateCommand("새 개인 블로그");
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from("riro"))).thenReturn(Optional.of(rilog));

        // when - then
        assertThatThrownBy(() -> blogCommandService.changeBlogProfile(99L, "riro", command))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(RILOG_POST_PUBLISH_FORBIDDEN);
        verify(blogRepository, never()).existsByProfileNameExceptId(command.name(), RILOG_ID);
        verify(tagAssetsPublisher, never()).synchronize(any(), any(), any());
        assertThat(rilog.getName()).isEqualTo("러로");
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
                .introduction("기록하는 개발자입니다.")
                .profileImageUrl("https://example.com/profile.png")
                .githubUrl("https://github.com/riro")
                .email(Email.from("riro@example.com"))
                .build();
    }

    private Blog createDetailedRilog(User owner) {
        return Blog.builder()
                .id(RILOG_ID)
                .owner(owner)
                .slug(Slug.from("riro"))
                .profile(Profile.createRilog(
                        owner.getNickname(),
                        owner.getIntroduction(),
                        owner.getProfileImageUrl(),
                        owner.getEmail(),
                        owner.getGithubUrl()
                ))
                .blogType(BlogType.RILOG)
                .build();
    }

    private BlogMember createMember(Blog blog, User user, BlogPermission permission) {
        return BlogMember.builder()
                .blog(blog)
                .user(user)
                .permission(permission)
                .status(BlogMemberStatus.ACTIVE)
                .build();
    }

    private BlogProfileUpdateCommand updateCommand(String name) {
        return new BlogProfileUpdateCommand(
                "https://example.com/new-profile.png",
                "https://example.com/new-cover.png",
                name,
                "새 소개",
                "https://new-rilog.example.com",
                "https://github.com/new-rilog",
                "new-rilog@example.com"
        );
    }

    private Profile createCologProfile() {
        return Profile.createColog(
                "리로그",
                "세계 최고의 블로그 플랫폼 Rilog. 입니다.",
                "https://example.com/profile.png",
                "https://example.com/cover.png",
                "https://rilog.example.com",
                "https://github.com/rilog",
                "test@test.com"
        );
    }

}
