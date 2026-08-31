package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogMemberStatus;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.command.BlogProfileUpdateCommand;
import kr.rilog.domain.blog.service.dto.result.BlogPublicProfileResult;
import kr.rilog.domain.chapter.repository.ChapterRepository;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.upload.service.TagAssetsLifecycle;
import kr.rilog.domain.upload.domain.vo.TagAssets;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.entity.vo.Email;
import kr.rilog.domain.user.entity.vo.Nickname;
import kr.rilog.domain.blog.entity.vo.Slug;
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
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_NOT_FOUND;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_SLUG_ALREADY_EXISTS;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.RILOG_POST_PUBLISH_FORBIDDEN;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BlogServiceTest {

    private static final String ERROR_INFORMATION = "errorInformation";
    private static final Long REQUESTER_ID = 1L;
    private static final Long COLOG_ID = 2L;
    private static final Long RILOG_ID = 3L;

    @Mock
    private BlogRepository blogRepository;

    @Mock
    private BlogMemberRepository blogMemberRepository;

    @Mock
    private PostRepository postRepository;

    @Mock
    private TagAssetsLifecycle tagAssetsLifecycle;

    @Mock
    private ChapterRepository chapterRepository;

    private BlogService blogService;

    @BeforeEach
    void setUp() {
        blogService = new BlogService(blogRepository, blogMemberRepository, postRepository, chapterRepository, tagAssetsLifecycle);
    }

    @Test
    @DisplayName("중복되지 않은 블로그 슬러그는 검증을 통과한다")
    void validateDuplicatedSlugPassesWhenBlogSlugDoesNotExist() {
        // given
        Slug slug = Slug.from("ri_log-01");
        when(blogRepository.existsBySlug(slug)).thenReturn(false);

        // when - then
        assertThatCode(() -> blogService.validateDuplicatedSlug(slug.getValue()))
                .doesNotThrowAnyException();
        verify(blogRepository).existsBySlug(slug);
    }

    @Test
    @DisplayName("중복된 블로그 슬러그이면 예외가 발생한다")
    void validateDuplicatedSlugThrowsWhenBlogSlugExists() {
        // given
        Slug slug = Slug.from("ri_log-01");
        when(blogRepository.existsBySlug(slug)).thenReturn(true);

        // when - then
        assertThatThrownBy(() -> blogService.validateDuplicatedSlug(slug.getValue()))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_SLUG_ALREADY_EXISTS);
        verify(blogRepository).existsBySlug(slug);
    }

    @Test
    @DisplayName("블로그 슬러그 중복 검사는 대소문자를 소문자로 정규화해 확인한다")
    void validateDuplicatedSlugChecksNormalizedSlug() {
        // given
        Slug normalizedSlug = Slug.from("ri_log-01");
        when(blogRepository.existsBySlug(normalizedSlug)).thenReturn(true);

        // when - then
        assertThatThrownBy(() -> blogService.validateDuplicatedSlug("Ri_Log-01"))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_SLUG_ALREADY_EXISTS);
        verify(blogRepository).existsBySlug(normalizedSlug);
    }

    @Test
    @DisplayName("중복되지 않은 블로그 프로필 이름은 검증을 통과한다")
    void validateDuplicatedProfileNamePassesWhenProfileNameDoesNotExist() {
        // given
        String profileName = "러로";
        when(blogRepository.existsByProfileName(profileName)).thenReturn(false);

        // when - then
        assertThatCode(() -> blogService.validateDuplicatedProfileName(profileName))
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
        assertThatThrownBy(() -> blogService.validateDuplicatedProfileName(profileName))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_PROFILE_NAME_ALREADY_EXISTS);
        verify(blogRepository).existsByProfileName(profileName);
    }

    @Test
    @DisplayName("개인 블로그가 없으면 사용자 정보로 RILOG를 생성한다")
    void createRilogIfAbsentCreatesRilogWhenMissing() {
        // given
        User owner = createCompletedOwner();
        when(blogRepository.findRilogByOwnerId(REQUESTER_ID)).thenReturn(Optional.empty());

        // when
        blogService.createRilogIfAbsent(owner);

        // then
        ArgumentCaptor<Blog> blogCaptor = ArgumentCaptor.forClass(Blog.class);
        verify(blogRepository).save(blogCaptor.capture());
        assertThat(blogCaptor.getValue())
                .extracting(
                        Blog::getOwner,
                        Blog::getName,
                        Blog::getSlug,
                        Blog::getIntroduction,
                        Blog::getProfileImageUrl,
                        Blog::getGithubUrl,
                        Blog::getEmail,
                        Blog::getBlogType
                )
                .containsExactly(
                        owner,
                        "러로",
                        "riro",
                        "기록하는 개발자입니다.",
                        "https://example.com/profile.png",
                        "https://github.com/riro",
                        "riro@example.com",
                        BlogType.RILOG
                );
    }

    @Test
    @DisplayName("이미 개인 블로그가 있으면 RILOG를 다시 생성하지 않는다")
    void createRilogIfAbsentDoesNotCreateRilogWhenAlreadyExists() {
        // given
        User owner = createCompletedOwner();
        Blog rilog = Blog.createRilog(owner);
        when(blogRepository.findRilogByOwnerId(REQUESTER_ID)).thenReturn(Optional.of(rilog));

        // when
        blogService.createRilogIfAbsent(owner);

        // then
        verify(blogRepository, never()).save(any(Blog.class));
    }

    @Test
    @DisplayName("팀 slug로 공개 프로필 정보를 조회한다")
    void getPublicProfileFindsCologBySlug() {
        // given
        User owner = createCompletedOwner();
        Blog colog = createDetailedColog(owner);
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from("team_Rilog"))).thenReturn(Optional.of(colog));
        when(blogMemberRepository.countActiveMembersByBlogId(COLOG_ID)).thenReturn(10L);
        when(postRepository.countPublicPublishedPostsByCologId(COLOG_ID)).thenReturn(24L);

        // when
        BlogPublicProfileResult result = blogService.getPublicProfile("team_Rilog");

        // then
        assertThat(result)
                .extracting(
                        BlogPublicProfileResult::type,
                        BlogPublicProfileResult::id,
                        BlogPublicProfileResult::name,
                        BlogPublicProfileResult::slug,
                        BlogPublicProfileResult::introduction,
                        BlogPublicProfileResult::profileImageUrl,
                        BlogPublicProfileResult::coverImageUrl,
                        BlogPublicProfileResult::serviceUrl,
                        BlogPublicProfileResult::githubUrl,
                        BlogPublicProfileResult::memberCount,
                        BlogPublicProfileResult::postCount
                )
                .containsExactly(
                        BlogType.COLOG,
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
    @DisplayName("개인 slug로 공개 프로필 정보를 조회하면 memberCount를 1로 반환한다")
    void getPublicProfileFindsRilogBySlug() {
        // given
        User owner = createCompletedOwner();
        Blog rilog = createDetailedRilog(owner);
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from("riro"))).thenReturn(Optional.of(rilog));
        when(postRepository.countPublicPublishedPostsByRilogId(RILOG_ID)).thenReturn(7L);

        // when
        BlogPublicProfileResult result = blogService.getPublicProfile("riro");

        // then
        assertThat(result)
                .extracting(
                        BlogPublicProfileResult::type,
                        BlogPublicProfileResult::id,
                        BlogPublicProfileResult::name,
                        BlogPublicProfileResult::slug,
                        BlogPublicProfileResult::introduction,
                        BlogPublicProfileResult::profileImageUrl,
                        BlogPublicProfileResult::coverImageUrl,
                        BlogPublicProfileResult::serviceUrl,
                        BlogPublicProfileResult::githubUrl,
                        BlogPublicProfileResult::memberCount,
                        BlogPublicProfileResult::postCount
                )
                .containsExactly(
                        BlogType.RILOG,
                        RILOG_ID,
                        "러로",
                        "riro",
                        "기록하는 개발자입니다.",
                        "https://example.com/profile.png",
                        null,
                        null,
                        "https://github.com/riro",
                        1L,
                        7L
                );
        verify(blogMemberRepository, never()).countActiveMembersByBlogId(any());
        verify(postRepository, never()).countPublicPublishedPostsByCologId(any());
        verify(postRepository).countPublicPublishedPostsByRilogId(RILOG_ID);
    }

    @Test
    @DisplayName("slug에 해당하는 블로그가 없으면 공개 프로필 조회를 거부한다")
    void getPublicProfileRejectsMissingColog() {
        // given
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from("unknown-team"))).thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> blogService.getPublicProfile("unknown-team"))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_NOT_FOUND);
        verify(blogMemberRepository, never()).countActiveMembersByBlogId(COLOG_ID);
        verify(postRepository, never()).countPublicPublishedPostsByCologId(COLOG_ID);
    }

    @Test
    @DisplayName("ADMIN이 COLOG 프로필을 변경하면 자기 자신을 제외하고 이름 중복을 검사한다")
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

        // when
        blogService.changeBlogProfile(REQUESTER_ID, "team_Rilog", command);

        // then
        verify(blogRepository).existsByProfileNameExceptId(command.name(), COLOG_ID);
        assertThat(colog.getName()).isEqualTo("새 리로그 팀");
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

        // when - then
        assertThatThrownBy(() -> blogService.changeBlogProfile(REQUESTER_ID, "team_Rilog", command))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(BLOG_PROFILE_NAME_ALREADY_EXISTS);
        assertThat(colog.getName()).isEqualTo("리로그");
    }

    @Test
    @DisplayName("RILOG 소유자가 개인 프로필을 변경하면 자기 자신을 제외하고 이름 중복을 검사한다")
    void changeBlogProfileForRilogAllowsOwner() {
        // given
        User owner = createCompletedOwner();
        Blog rilog = createDetailedRilog(owner);
        BlogProfileUpdateCommand command = updateCommand("새 개인 블로그");
        when(blogRepository.findBySlugAndDeletedAtIsNull(Slug.from("riro"))).thenReturn(Optional.of(rilog));
        when(blogRepository.existsByProfileNameExceptId(command.name(), RILOG_ID)).thenReturn(false);

        // when
        blogService.changeBlogProfile(REQUESTER_ID, "riro", command);

        // then
        verify(blogMemberRepository, never()).findByBlogIdAndUserIdAndStatus(any(), any(), any());
        verify(blogRepository).existsByProfileNameExceptId(command.name(), RILOG_ID);
        assertThat(rilog.getName()).isEqualTo("새 개인 블로그");
        assertThat(owner)
                .extracting(
                        User::getNickname,
                        User::getIntroduction,
                        User::getProfileImageUrl,
                        User::getGithubUrl,
                        User::getEmail
                )
                .containsExactly(
                        "새 개인 블로그",
                        "새 소개",
                        "https://example.com/new-profile.png",
                        "https://github.com/new-rilog",
                        "new-rilog@example.com"
                );
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
        blogService.changeBlogProfile(REQUESTER_ID, "team_Rilog", command);

        // then
        verify(tagAssetsLifecycle).synchronize(
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
        assertThatThrownBy(() -> blogService.changeBlogProfile(99L, "riro", command))
                .isInstanceOf(BlogException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(RILOG_POST_PUBLISH_FORBIDDEN);
        verify(blogRepository, never()).existsByProfileNameExceptId(command.name(), RILOG_ID);
        verify(tagAssetsLifecycle, never()).synchronize(any(), any());
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
