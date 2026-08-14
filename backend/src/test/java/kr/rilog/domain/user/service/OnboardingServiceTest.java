package kr.rilog.domain.user.service;

import kr.rilog.domain.blog.entity.Blog;
import kr.rilog.domain.blog.entity.enums.BlogType;
import kr.rilog.domain.blog.repository.BlogRepository;
import kr.rilog.domain.blog.service.BlogService;
import kr.rilog.domain.user.entity.OnboardingStatus;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.repository.UserRepository;
import kr.rilog.domain.user.service.dto.command.OnboardingCompleteCommand;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class OnboardingServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final BlogRepository blogRepository = mock(BlogRepository.class);
    private final OnboardingService onboardingService = new OnboardingService(
            new UserService(userRepository),
            new BlogService(blogRepository)
    );

    @Test
    @DisplayName("온보딩을 완료하면 사용자 개인 블로그를 생성한다")
    void completeCreatesRilogForCompletedUser() {
        // given
        User user = User.builder()
                .id(1L)
                .githubId(100L)
                .onboardingStatus(OnboardingStatus.PENDING)
                .build();
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.existsByNickname("러로")).thenReturn(false);
        when(userRepository.existsBySlug("riro")).thenReturn(false);
        when(userRepository.saveAndFlush(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(blogRepository.findRilogByOwnerId(1L)).thenReturn(Optional.empty());

        // when
        User completedUser = onboardingService.complete(1L, command());

        // then
        assertThat(completedUser.getOnboardingStatus()).isEqualTo(OnboardingStatus.COMPLETED);

        ArgumentCaptor<Blog> blogCaptor = ArgumentCaptor.forClass(Blog.class);
        verify(blogRepository).save(blogCaptor.capture());
        assertThat(blogCaptor.getValue())
                .extracting(Blog::getOwner, Blog::getName, Blog::getSlug, Blog::getBlogType)
                .containsExactly(completedUser, "러로", "riro", BlogType.RILOG);
    }

    private OnboardingCompleteCommand command() {
        return new OnboardingCompleteCommand(
                "러로",
                "riro",
                "기록하는 개발자입니다.",
                "https://example.com/profile.png",
                "https://github.com/jinriro",
                "riro@example.com"
        );
    }
}
