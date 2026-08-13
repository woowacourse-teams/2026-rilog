package kr.rilog.domain.auth.application.token.access;

import kr.rilog.domain.auth.application.GlobalRole;

import java.time.Instant;

public record AccessTokenClaims(
        Long userId,
        GlobalRole role,
        String slug,
        Instant issuedAt,
        Instant expiresAt
) {

    public static AccessTokenClaims of(
            Long userId,
            GlobalRole role,
            String slug,
            Instant issuedAt,
            Instant expiresAt
    ) {
        return new AccessTokenClaims(userId, role, slug, issuedAt, expiresAt);
    }
}
