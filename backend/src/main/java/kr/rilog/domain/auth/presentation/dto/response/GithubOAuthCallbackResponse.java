package kr.rilog.domain.auth.presentation.dto.response;

import kr.rilog.domain.user.entity.OnboardingStatus;

public record GithubOAuthCallbackResponse(
        String onboardingStatus,
        String redirectUrl
) {

    public static GithubOAuthCallbackResponse of(OnboardingStatus onboardingStatus, String redirectUrl) {
        return new GithubOAuthCallbackResponse(onboardingStatus.name(), redirectUrl);
    }
}
