package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.entity.enums.BlogPermission;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.dto.command.BlogProfileUpdateCommand;
import kr.rilog.domain.blog.service.dto.result.BlogPublicProfileResult;
import kr.rilog.domain.post.repository.PostRepository;
import kr.rilog.domain.user.entity.vo.Email;
import kr.rilog.domain.user.entity.vo.Nickname;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.PostFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_PROFILE_NAME_ALREADY_EXISTS;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_SLUG_ALREADY_EXISTS;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class BlogServiceIntegrationTest extends ServiceSupport {

    @Autowired
    private BlogService blogService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private BlogMemberRepository blogMemberRepository;

    @Autowired
    private PostRepository postRepository;

    @Test
    @DisplayName("활성 블로그의 slug와 중복되면 예외가 발생한다")
    void validateDuplicatedSlugThrowsWhenActiveBlogHasSlug() {
        // given
        User owner = userRepository.save(User.createPendingGithubUser(100L, "owner", "https://example.com/owner.png"));
        blogRepository.saveAndFlush(createColog(owner, "team-a", "리로그 팀"));

        // when - then
        assertThatThrownBy(() -> blogService.validateDuplicatedSlug("team-a"))
                .isInstanceOf(BlogException.class)
                .hasMessage(BLOG_SLUG_ALREADY_EXISTS.getMessage());
    }

    @Test
    @DisplayName("활성 블로그의 프로필 이름과 중복되면 예외가 발생한다")
    void validateDuplicatedProfileNameThrowsWhenActiveBlogHasProfileName() {
        // given
        User owner = userRepository.save(User.createPendingGithubUser(100L, "owner", "https://example.com/owner.png"));
        blogRepository.saveAndFlush(createColog(owner, "team-a", "리로그 팀"));

        // when - then
        assertThatThrownBy(() -> blogService.validateDuplicatedProfileName("리로그 팀"))
                .isInstanceOf(BlogException.class)
                .hasMessage(BLOG_PROFILE_NAME_ALREADY_EXISTS.getMessage());
    }

    @Test
    @DisplayName("삭제된 블로그의 프로필 이름은 중복 검사에서 제외한다")
    void validateDuplicatedProfileNameIgnoresDeletedBlogProfileName() {
        // given
        User owner = userRepository.save(User.createPendingGithubUser(100L, "owner", "https://example.com/owner.png"));
        Blog deletedColog = blogRepository.saveAndFlush(createColog(owner, "team-a", "리로그 팀"));
        deletedColog.delete();
        blogRepository.saveAndFlush(deletedColog);

        // when - then
        assertThatCode(() -> blogService.validateDuplicatedProfileName("리로그 팀"))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("ADMIN이 COLOG 프로필을 변경하면 변경된 프로필이 저장된다.")
    void changeBlogProfilePersistsChangedCologProfile() {
        // given
        User owner = userRepository.save(User.createPendingGithubUser(100L, "owner", "https://example.com/owner.png"));
        User admin = userRepository.save(User.createPendingGithubUser(200L, "admin", "https://example.com/admin.png"));
        Blog colog = blogRepository.save(createColog(owner, "team-a", "리로그 팀"));
        blogMemberRepository.saveAndFlush(
                BlogMember.invite(
                        colog,
                        admin,
                        "Backend",
                        BlogPermission.ADMIN,
                        LocalDateTime.now()
                )
        );
        BlogProfileUpdateCommand command = new BlogProfileUpdateCommand(
                "https://example.com/new-profile.png",
                "https://example.com/new-cover.png",
                "새 리로그 팀",
                "새 팀 소개",
                "https://new-rilog.example.com",
                "https://github.com/new-rilog",
                "new-rilog@example.com"
        );
        Profile expectedProfile = command.toProfile();

        // when
        blogService.changeBlogProfile(admin.getId(), "team-a", command);

        // then
        Blog savedColog = blogRepository.findById(colog.getId()).orElseThrow();
        assertThat(savedColog.getProfile())
                .usingRecursiveComparison()
                .isEqualTo(expectedProfile);
    }

    @Test
    @DisplayName("개인 slug로 공개 프로필을 조회하면 RILOG 프로필과 공개 게시글 수를 반환한다.")
    void getPublicProfileReturnsRilogProfile() {
        // given
        User owner = userRepository.save(createCompletedUser(300L, "러로", "riro"));
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(owner, "https://rilog.example.com"));
        Blog colog = blogRepository.saveAndFlush(createColog(owner, "team-a", "리로그 팀"));
        postRepository.saveAndFlush(PostFixture.publicPublishedRilogPost(rilog, owner));
        postRepository.saveAndFlush(PostFixture.privatePublishedRilogPost(rilog, owner));
        postRepository.saveAndFlush(PostFixture.publicPublishedColog(rilog, colog, owner));

        // when
        BlogPublicProfileResult result = blogService.getPublicProfile("riro");

        // then
        assertThat(result)
                .extracting(
                        BlogPublicProfileResult::type,
                        BlogPublicProfileResult::name,
                        BlogPublicProfileResult::slug,
                        BlogPublicProfileResult::memberCount,
                        BlogPublicProfileResult::postCount
                )
                .containsExactly(
                        BlogType.RILOG,
                        "러로",
                        "riro",
                        1L,
                        1L
                );
    }

    @Test
    @DisplayName("RILOG 프로필을 변경하면 개인 블로그와 소유자 프로필 정보가 함께 변경된다.")
    void changeBlogProfilePersistsChangedRilogProfileAndOwnerProfile() {
        // given
        User owner = userRepository.save(createCompletedUser(400L, "러로", "riro"));
        Blog rilog = blogRepository.saveAndFlush(Blog.createRilog(owner, "https://rilog.example.com"));
        BlogProfileUpdateCommand command = new BlogProfileUpdateCommand(
                "https://example.com/new-profile.png",
                null,
                "새 개인 블로그",
                "새 소개",
                "https://new-rilog.example.com",
                "https://github.com/new-rilog",
                "new-rilog@example.com"
        );

        // when
        blogService.changeBlogProfile(owner.getId(), "riro", command);

        // then
        Blog savedRilog = blogRepository.findById(rilog.getId()).orElseThrow();
        User savedOwner = userRepository.findById(owner.getId()).orElseThrow();

        assertThat(savedRilog)
                .extracting(
                        Blog::getName,
                        Blog::getIntroduction,
                        Blog::getProfileImageUrl,
                        Blog::getServiceUrl,
                        Blog::getGithubUrl,
                        Blog::getEmail
                )
                .containsExactly(
                        "새 개인 블로그",
                        "새 소개",
                        "https://example.com/new-profile.png",
                        "https://new-rilog.example.com",
                        "https://github.com/new-rilog",
                        "new-rilog@example.com"
                );
        assertThat(savedOwner)
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

    private Blog createColog(User owner, String slug, String name) {
        return Blog.createColog(
                owner,
                slug,
                Profile.createColog(
                        name,
                        "팀 소개",
                        "https://example.com/profile.png",
                        "https://example.com/cover.png",
                        "https://rilog.example.com",
                        "https://github.com/rilog",
                        "test@test.com"
                )
        );
    }

    private User createCompletedUser(Long githubId, String nickname, String slug) {
        return User.builder()
                .githubId(githubId)
                .nickname(Nickname.from(nickname))
                .slug(Slug.from(slug))
                .introduction("기록하는 개발자입니다.")
                .profileImageUrl("https://example.com/profile.png")
                .githubUrl("https://github.com/%s".formatted(slug))
                .email(Email.from("%s@example.com".formatted(slug)))
                .build();
    }

}
