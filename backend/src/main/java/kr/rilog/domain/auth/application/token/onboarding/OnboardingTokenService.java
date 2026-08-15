package kr.rilog.domain.auth.application.token.onboarding;

import kr.rilog.domain.auth.application.port.token.OnboardingTokenProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OnboardingTokenService {

    private final OnboardingTokenProvider onboardingTokenProvider;

    public OnboardingToken issue(Long userId) {
        return onboardingTokenProvider.issue(userId);
    }

    public OnboardingTokenClaims parse(String onboardingToken) {
        return onboardingTokenProvider.parse(onboardingToken);
    }
}
