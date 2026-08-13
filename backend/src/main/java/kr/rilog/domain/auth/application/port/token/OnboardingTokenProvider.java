package kr.rilog.domain.auth.application.port.token;

import kr.rilog.domain.auth.application.token.onboarding.OnboardingToken;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingTokenClaims;

public interface OnboardingTokenProvider {

    OnboardingToken issue(Long userId);

    OnboardingTokenClaims parse(String onboardingToken);
}
