package kr.rilog.domain.user.service.dto.result;

import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.refresh.RefreshToken;

public record OnboardingCompletionResult(
        AccessToken accessToken,
        RefreshToken refreshToken
) {
}
