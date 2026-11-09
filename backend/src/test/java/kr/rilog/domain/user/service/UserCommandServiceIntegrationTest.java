package kr.rilog.domain.user.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.BlogMember;
import kr.rilog.domain.blog.repository.BlogMemberRepository;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.exception.UserException;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.domain.user.service.dto.command.OnboardingCompleteCommand;
import kr.rilog.support.ServiceSupport;
import kr.rilog.support.fixure.UserFixture;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import static kr.rilog.domain.blog.entity.enums.BlogMemberStatus.ACTIVE;
import static kr.rilog.domain.blog.entity.enums.BlogPermission.OWNER;
import static kr.rilog.domain.user.entity.OnboardingStatus.COMPLETED;
import static kr.rilog.domain.user.entity.OnboardingStatus.PENDING;
import static kr.rilog.domain.user.exception.UserErrorInformation.SLUG_DUPLICATED;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class UserCommandServiceIntegrationTest extends ServiceSupport {

    @Autowired
    private UserCommandService userCommandService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private BlogRepository blogRepository;

    @Autowired
    private BlogMemberRepository blogMemberRepository;

    @Test
    @DisplayName("대기 중인 사용자가 온보딩을 완료하면 사용자 정보와 개인 Rilog를 저장한다.")
    void completeOnboardingPersistsCompletedUserAndRilog() {
        // given
        User pendingUser = userRepository.saveAndFlush(UserFixture.pending());
        OnboardingCompleteCommand command = onboardingCommand();

        // when
        userCommandService.completeOnboarding(pendingUser.getId(), command);

        // then
        User savedUser = userRepository.findById(pendingUser.getId()).orElseThrow();
        assertThat(savedUser.getNickname()).isEqualTo(command.nickname());
        assertThat(savedUser.getSlug()).isEqualTo(command.slug());
        assertThat(savedUser.getOnboardingStatus()).isEqualTo(COMPLETED);

        Blog savedRilog = blogRepository.findRilogByOwnerId(pendingUser.getId()).orElseThrow();
        assertThat(savedRilog.getSlug()).isEqualTo(savedUser.getSlug());
        assertThat(savedRilog.getServiceUrl()).isEqualTo(command.serviceUrl());
        BlogMember membership = blogMemberRepository
                .findByBlogIdAndUserIdAndStatus(savedRilog.getId(), savedUser.getId(), ACTIVE)
                .orElseThrow();
        assertThat(membership.getPermission()).isEqualTo(OWNER);
    }

    @Test
    @DisplayName("중복된 슬러그로 온보딩을 완료하면 예외가 발생한다.")
    void completeOnboardingThrowsAndPreservesPendingUserWhenSlugIsDuplicated() {
        // given
        userRepository.saveAndFlush(
                UserFixture.completedWithNicknameAndSlug("기존사용자", "ri_log_01")
        );
        User pendingUser = userRepository.saveAndFlush(UserFixture.pending());

        // when & then
        assertThatThrownBy(() -> userCommandService.completeOnboarding(pendingUser.getId(), onboardingCommand()))
                .isInstanceOf(UserException.class)
                .hasMessage(SLUG_DUPLICATED.getMessage());

        User savedUser = userRepository.findById(pendingUser.getId()).orElseThrow();
        assertThat(savedUser.getOnboardingStatus()).isEqualTo(PENDING);
    }

    private OnboardingCompleteCommand onboardingCommand() {
        return new OnboardingCompleteCommand(
                "러로",
                "ri_log_01",
                "기록하는 개발자입니다.",
                "https://example.com/profile.png",
                "https://github.com/rilog",
                "https://rilog.example.com",
                "rilog@example.com"
        );
    }

}
