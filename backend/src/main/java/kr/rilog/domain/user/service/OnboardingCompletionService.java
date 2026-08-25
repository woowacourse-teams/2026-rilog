package kr.rilog.domain.user.service;

import kr.rilog.domain.auth.application.token.AuthTokenPair;
import kr.rilog.domain.auth.application.token.AuthTokenPairIssuer;
import kr.rilog.domain.user.entity.User;
import kr.rilog.domain.user.service.dto.command.OnboardingCompleteCommand;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OnboardingCompletionService {

    private final UserService userService;
    private final AuthTokenPairIssuer authTokenPairIssuer;

    public AuthTokenPair complete(Long userId, OnboardingCompleteCommand command) {
        User user = userService.completeOnboarding(userId, command);
        return authTokenPairIssuer.issue(user);
    }
}
