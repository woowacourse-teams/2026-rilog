package kr.rilog.domain.auth.application.token.login;

import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.onboarding.OnboardingToken;
import kr.rilog.domain.auth.application.token.refresh.RefreshToken;

public sealed interface LoginTokenResult permits LoginTokenResult.Pending, LoginTokenResult.Completed {

    record Pending(
            OnboardingToken onboardingToken
    ) implements LoginTokenResult {
    }

    record Completed(
            AccessToken accessToken,
            RefreshToken refreshToken
    ) implements LoginTokenResult {
    }

}
