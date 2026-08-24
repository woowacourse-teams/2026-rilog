package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

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
    @DisplayName("프로필 이름 변경 시 자기 자신의 이름은 중복 검사에서 제외한다")
    void validateDuplicatedProfileNameExceptSelfIgnoresCurrentBlog() {
        // given
        User owner = userRepository.save(User.createPendingGithubUser(100L, "owner", "https://example.com/owner.png"));
        Blog colog = blogRepository.saveAndFlush(createColog(owner, "team-a", "리로그 팀"));

        // when - then
        assertThatCode(() -> blogService.validateDuplicatedProfileName("리로그 팀", colog.getId()))
                .doesNotThrowAnyException();
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

}
