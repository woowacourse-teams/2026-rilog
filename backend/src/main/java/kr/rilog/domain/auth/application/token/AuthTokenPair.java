package kr.rilog.domain.auth.application.token;

import kr.rilog.domain.auth.application.token.access.AccessToken;
import kr.rilog.domain.auth.application.token.refresh.RefreshToken;

public record AuthTokenPair(
        AccessToken accessToken,
        RefreshToken refreshToken
) {
}
