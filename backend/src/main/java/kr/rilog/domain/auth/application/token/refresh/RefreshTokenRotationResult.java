package kr.rilog.domain.auth.application.token.refresh;

import kr.rilog.domain.auth.application.token.access.AccessToken;

public record RefreshTokenRotationResult(
        AccessToken accessToken,
        RefreshToken refreshToken
) {

    public static RefreshTokenRotationResult of(AccessToken accessToken, RefreshToken refreshToken) {
        return new RefreshTokenRotationResult(accessToken, refreshToken);
    }
}
