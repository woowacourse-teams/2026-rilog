package kr.rilog.domain.user.service;

import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.domain.user.service.dto.result.UserInfoResult;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UserQueryServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final UserQueryService userQueryService = new UserQueryService(userRepository);

    @Test
    @DisplayName("존재하지 않는 사용자 ID로 정보를 조회하면 예외가 발생한다.")
    void getUserInformationRejectsMissingUser() {
        // given
        Long userId = 1L;
        when(userRepository.findById(userId)).thenReturn(Optional.empty());

        // when
        Throwable thrown = catchThrowable(() -> userQueryService.getUserInformation(userId));

        // then
        assertThat(thrown)
                .isInstanceOf(UserException.class)
                .hasMessage(USER_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("사용자 아이디로 등록된 사용자 정보를 조회한다.")
    void getUserInformationReturnsRegisteredUser() {
        // given
        User user = UserFixture.completedWithNicknameAndSlug("러로", "ri_log_01");
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        // when
        UserInfoResult result = userQueryService.getUserInformation(1L);

        // then
        assertThat(result).isEqualTo(UserInfoResult.from(user));
    }

    @Test
    @DisplayName("완료된 사용자 슬러그 조회 결과를 사용자 정보로 변환한다.")
    void getUserInfoReturnsCompletedUser() {
        // given
        User user = UserFixture.completedWithNicknameAndSlug("러로", "ri_log_01");
        when(userRepository.findBySlugAndOnboardingStatus(Slug.from("ri_log_01"), OnboardingStatus.COMPLETED))
                .thenReturn(Optional.of(user));

        // when
        UserInfoResult result = userQueryService.getUserInfo("ri_log_01");

        // then
        assertThat(result).isEqualTo(UserInfoResult.from(user));
    }

    @Test
    @DisplayName("슬러그에 해당하는 온보딩 완료 사용자가 없으면 예외가 발생한다.")
    void getUserInfoRejectsMissingCompletedUser() {
        // given
        when(userRepository.findBySlugAndOnboardingStatus(Slug.from("pending_user"), OnboardingStatus.COMPLETED))
                .thenReturn(Optional.empty());

        // when
        Throwable thrown = catchThrowable(() -> userQueryService.getUserInfo("pending_user"));

        // then
        assertThat(thrown)
                .isInstanceOf(UserException.class)
                .hasMessage(USER_NOT_FOUND.getMessage());
    }
}
