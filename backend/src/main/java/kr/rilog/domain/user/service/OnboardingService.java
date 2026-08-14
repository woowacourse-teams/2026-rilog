package kr.rilog.domain.user.service;

import kr.rilog.domain.blog.service.BlogService;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.service.dto.command.OnboardingCompleteCommand;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class OnboardingService {

    private final UserService userService;
    private final BlogService blogService;

    @Transactional
    public User complete(Long userId, OnboardingCompleteCommand command) {
        User user = userService.completeOnboarding(userId, command);
        blogService.createRilogIfAbsent(user);
        return user;
    }
}
