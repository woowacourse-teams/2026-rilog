package kr.rilog.domain.auth.application.token.onboarding;

import kr.rilog.domain.auth.application.port.token.OnboardingTokenProvider;
import org.springframework.stereotype.Service;

@Service
public class OnboardingTokenService {

    private final OnboardingTokenProvider onboardingTokenProvider;

    public OnboardingTokenService(OnboardingTokenProvider onboardingTokenProvider) {
        this.onboardingTokenProvider = onboardingTokenProvider;
    }

    public OnboardingToken issue(Long userId) {
        return onboardingTokenProvider.issue(userId);
    }

    public OnboardingTokenClaims parse(String onboardingToken) {
        return onboardingTokenProvider.parse(onboardingToken);
    }
}
