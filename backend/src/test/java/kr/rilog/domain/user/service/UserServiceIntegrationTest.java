package kr.rilog.domain.user.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.vo.Profile;
import kr.rilog.domain.blog.entity.vo.Slug;
import kr.rilog.domain.blog.exception.BlogException;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.domain.user.service.dto.command.OnboardingCompleteCommand;
import kr.rilog.domain.user.service.dto.result.UserInfoResult;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static kr.rilog.domain.blog.entity.enums.BlogType.RILOG;
import static kr.rilog.domain.blog.exception.BlogErrorInformation.BLOG_PROFILE_NAME_ALREADY_EXISTS;
import static kr.rilog.domain.user.entity.OnboardingStatus.COMPLETED;
import static kr.rilog.domain.user.entity.OnboardingStatus.PENDING;
import static kr.rilog.domain.user.exception.UserErrorInformation.ONBOARDING_ALREADY_COMPLETED;
import static kr.rilog.domain.user.exception.UserErrorInformation.SLUG_DUPLICATED;
import static kr.rilog.domain.user.exception.UserErrorInformation.USER_NOT_FOUND;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserServiceIntegrationTest extends ServiceSupport {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Test
    @DisplayName("사용자 아이디로 등록된 사용자 정보를 조회한다.")
    void getUserInformationReturnsRegisteredUser() {
        // given
        User savedUser = userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("러로", "ri_log-01")
        );
        UserInfoResult expected = UserInfoResult.from(savedUser);

        // when
        UserInfoResult result = userService.getUserInformation(savedUser.getId());

        // then
        assertThat(result).isEqualTo(expected);
    }

    @Test
    @DisplayName("존재하지 않는 사용자 아이디로 사용자 정보를 조회하면 예외가 발생한다.")
    void getUserInformationThrowsWhenUserDoesNotExist() {
        // when & then
        assertThatThrownBy(() -> userService.getUserInformation(Long.MIN_VALUE))
                .isInstanceOf(UserException.class)
                .hasMessage(USER_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("슬러그로 온보딩을 완료한 사용자 정보를 조회한다.")
    void getUserInfoReturnsCompletedUserBySlug() {
        // given
        User savedUser = userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("러로", "ri_log-01")
        );
        UserInfoResult expected = UserInfoResult.from(savedUser);

        // when
        UserInfoResult result = userService.getUserInfo("ri_log-01");

        // then
        assertThat(result).isEqualTo(expected);
    }

    @Test
    @DisplayName("슬러그에 해당하는 온보딩 완료 사용자가 없으면 예외가 발생한다.")
    void getUserInfoThrowsWhenCompletedUserDoesNotExist() {
        // given
        userRepository.saveAndFlush(UserFixture.pending());

        // when & then
        assertThatThrownBy(() -> userService.getUserInfo("pending-user"))
                .isInstanceOf(UserException.class)
                .hasMessage(USER_NOT_FOUND.getMessage());
    }

    @Test
    @DisplayName("대기 중인 사용자가 온보딩을 완료하면 사용자 정보를 저장한다.")
    void completeOnboardingPersistsCompletedUser() {
        // given
        User pendingUser = userRepository.saveAndFlush(UserFixture.pending());
        OnboardingCompleteCommand command = onboardingCommand();

        // when
        User result = userService.completeOnboarding(pendingUser.getId(), command);

        // then
        User savedUser = userRepository.findById(pendingUser.getId()).orElseThrow();

        assertThat(result.getNickname()).isEqualTo(command.nickname());
        assertThat(result.getSlug()).isEqualTo(command.slug());
        assertThat(result.getIntroduction()).isEqualTo(command.introduction());
        assertThat(result.getProfileImageUrl()).isEqualTo(command.profileImageUrl());
        assertThat(result.getGithubUrl()).isEqualTo(command.githubUrl());
        assertThat(result.getEmail()).isEqualTo(command.email());
        assertThat(result.getOnboardingStatus()).isEqualTo(COMPLETED);
        assertThat(savedUser)
                .usingRecursiveComparison()
                .ignoringFields("createdAt", "updatedAt", "onboardingCompletedAt")
                .isEqualTo(result);
    }

    @Test
    @DisplayName("대기 중인 사용자가 온보딩을 완료하면 개인 Rilog를 저장한다.")
    void completeOnboardingPersistsRilog() {
        // given
        User pendingUser = userRepository.saveAndFlush(UserFixture.pending());
        OnboardingCompleteCommand command = onboardingCommand();

        // when
        User result = userService.completeOnboarding(pendingUser.getId(), command);

        // then
        Blog savedRilog = blogRepository.findRilogByOwnerId(pendingUser.getId()).orElseThrow();
        Profile expectedProfile = Profile.createRilog(
                command.nickname(),
                command.introduction(),
                command.profileImageUrl(),
                command.email(),
                command.githubUrl()
        );

        assertThat(result.getSlug()).isEqualTo(savedRilog.getSlug());
        assertThat(savedRilog.getOwner().getId()).isEqualTo(result.getId());
        assertThat(savedRilog.getProfile()).isEqualTo(expectedProfile);
        assertThat(savedRilog.getBlogType()).isEqualTo(RILOG);
    }

    @Test
    @DisplayName("존재하지 않는 사용자는 온보딩을 완료할 수 없다.")
    void completeOnboardingThrowsWhenUserDoesNotExist() {
        // when & then
        assertThatThrownBy(() -> userService.completeOnboarding(Long.MIN_VALUE, onboardingCommand()))
                .isInstanceOf(UserException.class)
                .hasMessage(USER_NOT_FOUND.getMessage());

        assertThat(blogRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("이미 온보딩을 완료한 사용자는 다시 온보딩을 완료할 수 없다.")
    void completeOnboardingThrowsWhenUserAlreadyCompletedOnboarding() {
        // given
        User completedUser = userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("기존사용자", "existing-user")
        );

        // when & then
        assertThatThrownBy(() -> userService.completeOnboarding(completedUser.getId(), onboardingCommand()))
                .isInstanceOf(UserException.class)
                .hasMessage(ONBOARDING_ALREADY_COMPLETED.getMessage());

        User savedUser = userRepository.findById(completedUser.getId()).orElseThrow();
        assertThat(savedUser.getNickname()).isEqualTo("기존사용자");
        assertThat(savedUser.getSlug()).isEqualTo("existing-user");
        assertThat(blogRepository.findAll()).isEmpty();
    }

    @Test
    @DisplayName("중복된 블로그 프로필 이름으로 온보딩을 완료하면 예외가 발생하고 대기 상태를 유지한다.")
    void completeOnboardingThrowsAndPreservesPendingUserWhenProfileNameIsDuplicated() {
        // given
        User existingUser = userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("러로", "existing-user")
        );
        blogRepository.saveAndFlush(Blog.createRilog(existingUser));
        User pendingUser = userRepository.saveAndFlush(UserFixture.pending());

        // when & then
        assertThatThrownBy(() -> userService.completeOnboarding(pendingUser.getId(), onboardingCommand()))
                .isInstanceOf(BlogException.class)
                .hasMessage(BLOG_PROFILE_NAME_ALREADY_EXISTS.getMessage());

        User savedUser = userRepository.findById(pendingUser.getId()).orElseThrow();
        assertThat(savedUser.getOnboardingStatus()).isEqualTo(PENDING);
        assertThat(savedUser.getNickname()).isNull();
        assertThat(blogRepository.findRilogByOwnerId(pendingUser.getId())).isEmpty();
    }

    @Test
    @DisplayName("중복된 슬러그로 온보딩을 완료하면 예외가 발생한다.")
    void completeOnboardingThrowsAndPreservesPendingUserWhenSlugIsDuplicated() {
        // given
        userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("기존사용자", "ri_log-01")
        );
        User pendingUser = userRepository.saveAndFlush(UserFixture.pending());

        // when & then
        assertThatThrownBy(() -> userService.completeOnboarding(pendingUser.getId(), onboardingCommand()))
                .isInstanceOf(UserException.class)
                .hasMessage(SLUG_DUPLICATED.getMessage());

        User savedUser = userRepository.findById(pendingUser.getId()).orElseThrow();
        assertThat(savedUser.getOnboardingStatus()).isEqualTo(PENDING);
    }

    @Test
    @DisplayName("등록된 유저 슬러그를 검사하면 중복 예외가 발생한다.")
    void validateDuplicatedSlugThrowsWhenSlugExists() {
        // given
        String duplicatedSlug = "duplicated-slug";
        userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("기존사용자", duplicatedSlug)
        );

        // when & then
        assertThatThrownBy(() -> userService.validateDuplicatedUserSlug(duplicatedSlug))
                .isInstanceOf(UserException.class)
                .hasMessage(SLUG_DUPLICATED.getMessage());
    }

    private OnboardingCompleteCommand onboardingCommand() {
        return new OnboardingCompleteCommand(
                "러로",
                "ri_log-01",
                "기록하는 개발자입니다.",
                "https://example.com/profile.png",
                "https://github.com/rilog",
                "rilog@example.com"
        );
    }

}
