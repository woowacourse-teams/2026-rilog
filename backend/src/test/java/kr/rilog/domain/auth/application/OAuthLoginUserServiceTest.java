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

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
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
        when(userRepository.findByGithubId(10L)).thenReturn(Optional.of(existingUser));

        // when
        User user = service.findOrCreate(githubUser());

        // then
        assertSame(existingUser, user);
        verify(userRepository).findByGithubId(10L);
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    @DisplayName("최초 GitHub 로그인 사용자는 PENDING 상태로 생성한다")
    void findOrCreateCreatesPendingUserWhenGithubUserDoesNotExist() {
        // given
        OAuthLoginUserService service = new OAuthLoginUserService(userRepository);
        when(userRepository.findByGithubId(10L)).thenReturn(Optional.empty());
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // when
        User user = service.findOrCreate(githubUser());

        // then
        ArgumentCaptor<User> userCaptor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).saveAndFlush(userCaptor.capture());

        User savedUser = userCaptor.getValue();
        assertSame(savedUser, user);
        assertEquals(10L, savedUser.getGithubId());
        assertEquals(OnboardingStatus.PENDING, savedUser.getOnboardingStatus());
        assertEquals("https://github.com/octocat", savedUser.getGithubUrl());
        assertEquals("https://github.com/images/error/octocat_happy.gif", savedUser.getProfileImageUrl());
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
        when(userRepository.findByGithubId(10L))
                .thenReturn(Optional.empty())
                .thenReturn(Optional.of(existingUser));
        when(userRepository.saveAndFlush(any(User.class)))
                .thenThrow(new DataIntegrityViolationException("duplicate github id"));

        // when
        User user = service.findOrCreate(githubUser());

        // then
        assertSame(existingUser, user);
        verify(userRepository, times(2)).findByGithubId(10L);
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
