package kr.rilog.domain.user.service;

import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.domain.user.service.dto.result.UserInfoResult;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserQueryServiceTest {

    private static final String ERROR_INFORMATION = "errorInformation";

    @Mock
    private UserRepository userRepository;

    @Test
    @DisplayName("slug로 온보딩 완료 사용자 정보를 조회한다")
    void getUserInfoFindsCompletedUserBySlug() {
        // given
        UserQueryService userQueryService = new UserQueryService(userRepository);
        User user = completedUser();
        when(userRepository.findBySlugAndOnboardingStatus("jinriro", OnboardingStatus.COMPLETED))
                .thenReturn(Optional.of(user));

        // when
        UserInfoResult result = userQueryService.getUserInfo("jinriro");

        // then
        assertThat(result)
                .extracting(
                        UserInfoResult::id,
                        UserInfoResult::nickname,
                        UserInfoResult::slug,
                        UserInfoResult::profileImageUrl
                )
                .containsExactly(
                        1L,
                        "리로",
                        "jinriro",
                        "https://example.com/profile.png"
                );
    }

    @Test
    @DisplayName("slug에 해당하는 온보딩 완료 사용자가 없으면 조회를 거부한다")
    void getUserInfoRejectsMissingCompletedUser() {
        // given
        UserQueryService userQueryService = new UserQueryService(userRepository);
        when(userRepository.findBySlugAndOnboardingStatus("pending-user", OnboardingStatus.COMPLETED))
                .thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> userQueryService.getUserInfo("pending-user"))
                .isInstanceOf(UserException.class)
                .extracting(ERROR_INFORMATION)
                .isEqualTo(USER_NOT_FOUND);
    }

    private User completedUser() {
        return User.builder()
                .id(1L)
                .githubId(100L)
                .nickname("리로")
                .slug("jinriro")
                .profileImageUrl("https://example.com/profile.png")
                .onboardingStatus(OnboardingStatus.COMPLETED)
                .build();
    }
}
