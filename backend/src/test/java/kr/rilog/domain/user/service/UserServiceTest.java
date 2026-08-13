package kr.rilog.domain.user.service;

import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static kr.rilog.domain.user.exception.UserErrorInformation.NICKNAME_DUPLICATED;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final UserService userService = new UserService(userRepository);

    @Test
    @DisplayName("중복되지 않은 닉네임은 검증을 통과한다")
    void validateDuplicatedNicknamePassesWhenNicknameDoesNotExist() {
        // given
        String nickname = "러로";
        when(userRepository.existsByNickname(nickname)).thenReturn(false);

        // when - then
        assertThatCode(() -> userService.validateDuplicatedNickname(nickname))
                .doesNotThrowAnyException();
        verify(userRepository).existsByNickname(nickname);
    }

    @Test
    @DisplayName("중복된 닉네임이면 예외가 발생한다")
    void validateDuplicatedNicknameThrowsWhenNicknameExists() {
        // given
        String nickname = "러로";
        when(userRepository.existsByNickname(nickname)).thenReturn(true);

        // when - then
        assertThatThrownBy(() -> userService.validateDuplicatedNickname(nickname))
                .isInstanceOf(UserException.class)
                .extracting("errorInformation")
                .isEqualTo(NICKNAME_DUPLICATED);
        verify(userRepository).existsByNickname(nickname);
    }

    @Test
    @DisplayName("중복되지 않은 슬러그는 검증을 통과한다")
    void validateDuplicatedSlugPassesWhenSlugDoesNotExist() {
        // given
        String slug = "ri_log-01";
        when(userRepository.existsBySlug(slug)).thenReturn(false);

        // when - then
        assertThatCode(() -> userService.validateDuplicatedSlug(slug))
                .doesNotThrowAnyException();
        verify(userRepository).existsBySlug(slug);
    }

    @Test
    @DisplayName("중복된 슬러그이면 예외가 발생한다")
    void validateDuplicatedSlugThrowsWhenSlugExists() {
        // given
        String slug = "ri_log-01";
        when(userRepository.existsBySlug(slug)).thenReturn(true);

        // when - then
        assertThatThrownBy(() -> userService.validateDuplicatedSlug(slug))
                .isInstanceOf(UserException.class)
                .extracting("errorInformation")
                .isEqualTo(NICKNAME_DUPLICATED);
        verify(userRepository).existsBySlug(slug);
    }
}
