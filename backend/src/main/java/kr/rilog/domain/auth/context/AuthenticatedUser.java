package kr.rilog.domain.auth.context;

import kr.rilog.domain.auth.application.token.access.AccessTokenClaims;
import kr.rilog.domain.auth.application.GlobalRole;

public record AuthenticatedUser(
        Long userId,
        GlobalRole role,
        String slug
) {

    public static AuthenticatedUser from(AccessTokenClaims claims) {
        return new AuthenticatedUser(
                claims.userId(),
                claims.role(),
                claims.slug()
        );
    }
}
