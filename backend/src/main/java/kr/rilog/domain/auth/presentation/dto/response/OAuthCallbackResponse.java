package kr.rilog.domain.auth.presentation.dto.response;

import kr.rilog.domain.user.entity.OnboardingStatus;

public record OAuthCallbackResponse(
        String onboardingStatus,
        String redirectUrl
) {

    public static OAuthCallbackResponse of(OnboardingStatus onboardingStatus, String redirectUrl) {
        return new OAuthCallbackResponse(onboardingStatus.name(), redirectUrl);
    }
}
