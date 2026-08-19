package kr.rilog.domain.user.service;

import kr.rilog.domain.blog.entity.Slug;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.entity.vo.Nickname;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.domain.user.service.dto.result.UserInfoResult;
import kr.rilog.support.ServiceSupport;
import org.assertj.core.api.Assertions;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static kr.rilog.domain.user.exception.UserErrorInformation.NICKNAME_DUPLICATED;
import static kr.rilog.domain.user.exception.UserErrorInformation.SLUG_DUPLICATED;

class UserServiceIntegrationTest extends ServiceSupport {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private UserService userService;

    @Test
    @DisplayName("userId로 등록된 사용자를 조회할 수 있다.")
    void getUserInformationById() {
        // given
        String nickname = "songsong";
        String slug = "koreaioi";
        User saved = userRepository.save(completedUser(nickname, slug));
        UserInfoResult expected = UserInfoResult.from(saved);

        // when
        UserInfoResult actual = userService.getUserInformation(saved.getId());

        // then
        Assertions.assertThat(actual)
                .usingRecursiveComparison()
                .isEqualTo(expected);
    }

    @Test
    @DisplayName("이미 사용중인 닉네임을 검사하면 중복 예외가 발생한다.")
    void validateDuplicatedNickname() {
        // given
        String duplicatedNickname = "duplicatedNickname";
        String slug = "koreaioi";
        userRepository.save(completedUser(duplicatedNickname, slug));

        // when & then
        Assertions.assertThatThrownBy(() -> userService.validateDuplicatedNickname(duplicatedNickname))
                .isInstanceOf(UserException.class)
                .hasMessage(NICKNAME_DUPLICATED.getMessage());
    }

    @Test
    @DisplayName("이미 사용중인 슬러그을 검사하면 중복 예외가 발생한다.")
    void validateDuplicatedSlug() {
        // given
        String duplicatedSlug = "duplicatedSlug";
        String nickname = "songsong";
        userRepository.save(completedUser(nickname, duplicatedSlug));

        // when & then
        Assertions.assertThatThrownBy(() -> userService.validateDuplicatedSlug(duplicatedSlug))
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
