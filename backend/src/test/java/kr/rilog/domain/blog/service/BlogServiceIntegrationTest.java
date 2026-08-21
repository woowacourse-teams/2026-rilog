package kr.rilog.domain.blog.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.entity.vo.Nickname;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.support.ServiceSupport;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static kr.rilog.domain.user.exception.UserErrorInformation.SLUG_DUPLICATED;

class BlogServiceIntegrationTest extends ServiceSupport {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private BlogService blogService;

    @Test
    @DisplayName("이미 사용중인 블로그 슬러그를 검사하면 중복 예외가 발생한다.")
    void validateDuplicatedSlug() {
        // given
        String duplicatedSlug = "duplicatedSlug";
        User user = userRepository.save(completedUser("songsong", duplicatedSlug));
        blogRepository.save(Blog.createRilog(user));

        // when & then
        Assertions.assertThatThrownBy(() -> blogService.validateDuplicatedSlug(duplicatedSlug))
                .isInstanceOf(UserException.class)
                .hasMessage(SLUG_DUPLICATED.getMessage());
    }

    private User completedUser(String nickname, String slug) {
        return User.builder()
                .githubId(100L)
                .nickname(Nickname.from(nickname))
                .slug(Slug.from(slug))
                .profileImageUrl("https://example.com/profile.png")
                .onboardingStatus(OnboardingStatus.COMPLETED)
                .build();
    }

}
