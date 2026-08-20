package kr.rilog.domain.user.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.entity.vo.Nickname;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.domain.user.service.dto.command.OnboardingCompleteCommand;
import kr.rilog.domain.blog.entity.vo.Slug;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static kr.rilog.domain.user.exception.UserErrorInformation.NICKNAME_DUPLICATED;
import static kr.rilog.domain.user.exception.UserErrorInformation.ONBOARDING_ALREADY_COMPLETED;
import static kr.rilog.domain.user.exception.UserErrorInformation.SLUG_DUPLICATED;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final BlogRepository blogRepository = mock(BlogRepository.class);
    private final UserService userService = new UserService(userRepository, blogRepository);

    @Test
    @DisplayName("중복되지 않은 닉네임은 검증을 통과한다")
    void validateDuplicatedNicknamePassesWhenNicknameDoesNotExist() {
        // given
        Nickname nickname = Nickname.from("러로");
        when(userRepository.existsByNickname(nickname)).thenReturn(false);

        // when - then
        assertThatCode(() -> userService.validateDuplicatedNickname(nickname.getValue()))
                .doesNotThrowAnyException();
        verify(userRepository).existsByNickname(nickname);
    }

    @Test
    @DisplayName("중복된 닉네임이면 예외가 발생한다")
    void validateDuplicatedNicknameThrowsWhenNicknameExists() {
        // given
        Nickname nickname = Nickname.from("러로");
        when(userRepository.existsByNickname(nickname)).thenReturn(true);

        // when - then
        assertThatThrownBy(() -> userService.validateDuplicatedNickname(nickname.getValue()))
                .isInstanceOf(UserException.class)
                .extracting("errorInformation")
                .isEqualTo(NICKNAME_DUPLICATED);
        verify(userRepository).existsByNickname(nickname);
    }

    @Test
    @DisplayName("중복되지 않은 슬러그는 검증을 통과한다")
    void validateDuplicatedSlugPassesWhenSlugDoesNotExist() {
        // given
        Slug slug = Slug.from("ri_log-01");
        when(userRepository.existsBySlug(slug)).thenReturn(false);

        // when - then
        assertThatCode(() -> userService.validateDuplicatedSlug(slug.getValue()))
                .doesNotThrowAnyException();
        verify(userRepository).existsBySlug(slug);
    }

    @Test
    @DisplayName("중복된 슬러그이면 예외가 발생한다")
    void validateDuplicatedSlugThrowsWhenSlugExists() {
        // given
        Slug slug = Slug.from("ri_log-01");
        when(userRepository.existsBySlug(slug)).thenReturn(true);

        // when - then
        assertThatThrownBy(() -> userService.validateDuplicatedSlug(slug.getValue()))
                .isInstanceOf(UserException.class)
                .extracting("errorInformation")
                .isEqualTo(SLUG_DUPLICATED);
        verify(userRepository).existsBySlug(slug);
    }

    @Test
    @DisplayName("PENDING 사용자는 온보딩을 완료할 수 있다")
    void completeOnboardingCompletesPendingUser() {
        // given
        User user = User.builder()
                .id(1L)
                .githubId(100L)
                .onboardingStatus(OnboardingStatus.PENDING)
                .build();
        OnboardingCompleteCommand command = command();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.existsByNickname(Nickname.from("러로"))).thenReturn(false);
        when(userRepository.existsBySlug(Slug.from("ri_log-01"))).thenReturn(false);
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(blogRepository.findRilogByOwnerId(1L)).thenReturn(Optional.empty());

        // when
        User completedUser = userService.completeOnboarding(1L, command);

        // then
        assertThat(completedUser)
                .extracting(
                        User::getNickname,
                        User::getSlug,
                        User::getIntroduction,
                        User::getProfileImageUrl,
                        User::getGithubUrl,
                        User::getEmail,
                        User::getOnboardingStatus
                )
                .containsExactly(
                        "러로",
                        "ri_log-01",
                        "기록하는 개발자입니다.",
                        "https://example.com/profile.png",
                        "https://github.com/jinriro",
                        "riro@example.com",
                        OnboardingStatus.COMPLETED
                );
        verify(userRepository).saveAndFlush(user);
    }

    @Test
    @DisplayName("온보딩을 완료하면 사용자 개인 블로그를 생성한다")
    void completeOnboardingCreatesRilog() {
        // given
        User user = User.builder()
                .id(1L)
                .githubId(100L)
                .onboardingStatus(OnboardingStatus.PENDING)
                .build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.existsByNickname(Nickname.from("러로"))).thenReturn(false);
        when(userRepository.existsBySlug(Slug.from("ri_log-01"))).thenReturn(false);
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(blogRepository.findRilogByOwnerId(1L)).thenReturn(Optional.empty());

        // when
        User completedUser = userService.completeOnboarding(1L, command());

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
                        completedUser,
                        "러로",
                        "ri_log-01",
                        "기록하는 개발자입니다.",
                        "https://example.com/profile.png",
                        "https://github.com/jinriro",
                        "riro@example.com",
                        BlogType.RILOG
                );
    }

    @Test
    @DisplayName("이미 개인 블로그가 있으면 온보딩 완료 시 다시 생성하지 않는다")
    void completeOnboardingDoesNotCreateRilogWhenAlreadyExists() {
        // given
        User user = User.builder()
                .id(1L)
                .githubId(100L)
                .onboardingStatus(OnboardingStatus.PENDING)
                .build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.existsByNickname(Nickname.from("러로"))).thenReturn(false);
        when(userRepository.existsBySlug(Slug.from("ri_log-01"))).thenReturn(false);
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(blogRepository.findRilogByOwnerId(1L)).thenAnswer(invocation -> Optional.of(Blog.createRilog(user)));

        // when
        userService.completeOnboarding(1L, command());

        // then
        verify(blogRepository, never()).save(any(Blog.class));
    }

    @Test
    @DisplayName("존재하지 않는 사용자는 온보딩을 완료할 수 없다")
    void completeOnboardingRejectsMissingUser() {
        // given
        when(userRepository.findById(1L)).thenReturn(Optional.empty());

        // when - then
        assertThatThrownBy(() -> userService.completeOnboarding(1L, command()))
                .isInstanceOf(UserException.class)
                .extracting("errorInformation")
                .isEqualTo(USER_NOT_FOUND);
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    @DisplayName("이미 온보딩을 완료한 사용자는 다시 온보딩을 완료할 수 없다")
    void completeOnboardingRejectsCompletedUser() {
        // given
        User user = User.builder()
                .id(1L)
                .githubId(100L)
                .slug(Slug.from("jinriro"))
                .onboardingStatus(OnboardingStatus.COMPLETED)
                .build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        // when - then
        assertThatThrownBy(() -> userService.completeOnboarding(1L, command()))
                .isInstanceOf(UserException.class)
                .extracting("errorInformation")
                .isEqualTo(ONBOARDING_ALREADY_COMPLETED);
        verify(userRepository, never()).existsByNickname(any(Nickname.class));
        verify(userRepository, never()).existsBySlug(any(Slug.class));
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    @DisplayName("중복된 닉네임이면 온보딩 완료를 거부한다")
    void completeOnboardingRejectsDuplicatedNickname() {
        // given
        User user = User.builder()
                .id(1L)
                .githubId(100L)
                .onboardingStatus(OnboardingStatus.PENDING)
                .build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.existsByNickname(Nickname.from("러로"))).thenReturn(true);

        // when - then
        assertThatThrownBy(() -> userService.completeOnboarding(1L, command()))
                .isInstanceOf(UserException.class)
                .extracting("errorInformation")
                .isEqualTo(NICKNAME_DUPLICATED);
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    @Test
    @DisplayName("중복된 슬러그이면 온보딩 완료를 거부한다")
    void completeOnboardingRejectsDuplicatedSlug() {
        // given
        User user = User.builder()
                .id(1L)
                .githubId(100L)
                .onboardingStatus(OnboardingStatus.PENDING)
                .build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.existsByNickname(Nickname.from("러로"))).thenReturn(false);
        when(userRepository.existsBySlug(Slug.from("ri_log-01"))).thenReturn(true);

        // when - then
        assertThatThrownBy(() -> userService.completeOnboarding(1L, command()))
                .isInstanceOf(UserException.class)
                .extracting("errorInformation")
                .isEqualTo(SLUG_DUPLICATED);
        verify(userRepository, never()).saveAndFlush(any(User.class));
    }

    private OnboardingCompleteCommand command() {
        return new OnboardingCompleteCommand(
                "러로",
                "ri_log-01",
                "기록하는 개발자입니다.",
                "https://example.com/profile.png",
                "https://github.com/jinriro",
                "riro@example.com"
        );
    }
}
