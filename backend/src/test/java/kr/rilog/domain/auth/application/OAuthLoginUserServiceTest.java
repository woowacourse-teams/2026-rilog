package kr.rilog.domain.auth.application;

import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class OAuthLoginUserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Test
    @DisplayName("GitHub 사용자 ID로 기존 사용자를 조회한다")
    void findOrCreateReturnsExistingUserByGithubId() {
        // given
        User existingUser = User.builder()
                .id(1L)
                .githubId(10L)
                .build();
        OAuthLoginUserService service = new OAuthLoginUserService(userRepository);
        when(userRepository.existsByGithubId(10L)).thenReturn(true);
        when(userRepository.findByGithubId(10L)).thenReturn(Optional.of(existingUser));

        // when
        User user = service.findOrCreate(githubUser());

        // then
        assertThat(user).isSameAs(existingUser);
        verify(userRepository).existsByGithubId(10L);
        verify(userRepository).findByGithubId(10L);
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    @DisplayName("최초 GitHub 로그인 사용자는 PENDING 상태로 생성한다")
    void findOrCreateCreatesPendingUserWhenGithubUserDoesNotExist() {
        // given
        OAuthLoginUserService service = new OAuthLoginUserService(userRepository);
        when(userRepository.existsByGithubId(10L)).thenReturn(false);
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // when
        service.findOrCreate(githubUser());

        // then
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(userCaptor.capture());

        User savedUser = userCaptor.getValue();
        assertThat(savedUser.getOnboardingStatus()).isEqualTo(OnboardingStatus.PENDING);
    }

    @Test
    @DisplayName("최초 GitHub 로그인 사용자는 GitHub 계정 식별 정보를 저장한다")
    void findOrCreateStoresGithubAccountInformationWhenGithubUserDoesNotExist() {
        // given
        OAuthLoginUserService service = new OAuthLoginUserService(userRepository);
        when(userRepository.existsByGithubId(10L)).thenReturn(false);
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // when
        service.findOrCreate(githubUser());

        // then
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(userCaptor.capture());

        User savedUser = userCaptor.getValue();
        assertThat(savedUser)
                .extracting(
                        User::getGithubId,
                        User::getGithubUrl,
                        User::getProfileImageUrl
                )
                .containsExactly(
                        10L,
                        "https://github.com/octocat",
                        "https://github.com/images/error/octocat_happy.gif"
                );
    }

    @Test
    @DisplayName("동시 최초 로그인으로 중복 생성이 감지되면 생성된 사용자를 다시 조회한다")
    void findOrCreateReloadsUserWhenConcurrentCreateIsDetected() {
        // given
        User existingUser = User.builder()
                .id(1L)
                .githubId(10L)
                .build();
        OAuthLoginUserService service = new OAuthLoginUserService(userRepository);
        when(userRepository.existsByGithubId(10L)).thenReturn(false);
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate github id"));
        when(userRepository.findByGithubId(10L)).thenReturn(Optional.of(existingUser));

        // when
        User user = service.findOrCreate(githubUser());

        // then
        assertThat(user).isSameAs(existingUser);
        verify(userRepository).existsByGithubId(10L);
        verify(userRepository).findByGithubId(10L);
    }

    private SocialLoginUser githubUser() {
        return new SocialLoginUser(
                SocialLoginProvider.GITHUB,
                "10",
                "octocat",
                "https://github.com/images/error/octocat_happy.gif"
        );
    }
}
