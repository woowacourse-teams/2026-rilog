package kr.rilog.domain.auth.application.token.access;

import kr.rilog.domain.auth.application.GlobalRole;
import kr.rilog.domain.auth.application.port.token.AccessTokenProvider;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

class AccessTokenServiceTest {

    @Test
    @DisplayName("Access Token 발급을 provider에 위임한다")
    void issueDelegatesToAccessTokenProvider() {
        // given
        AccessTokenService accessTokenService = new AccessTokenService(new StubAccessTokenProvider());

        // when
        AccessToken accessToken = accessTokenService.issue(1L, GlobalRole.USER, "jinriro");

        // then
        assertThat(accessToken.value()).isEqualTo("access-token:1:USER:jinriro");
    }

    @Test
    @DisplayName("Access Token 파싱을 provider에 위임한다")
    void parseDelegatesToAccessTokenProvider() {
        // given
        AccessTokenService accessTokenService = new AccessTokenService(new StubAccessTokenProvider());

        // when
        AccessTokenClaims claims = accessTokenService.parse("access-token");

        // then
        assertThat(claims)
                .extracting(
                        AccessTokenClaims::userId,
                        AccessTokenClaims::role,
                        AccessTokenClaims::slug,
                        AccessTokenClaims::issuedAt,
                        AccessTokenClaims::expiresAt
                )
                .containsExactly(
                        1L,
                        GlobalRole.USER,
                        "jinriro",
                        Instant.parse("2026-08-13T00:00:00Z"),
                        Instant.parse("2026-08-13T00:15:00Z")
                );
    }

    private static class StubAccessTokenProvider implements AccessTokenProvider {

        @Override
        public AccessToken issue(Long userId, GlobalRole role, String slug) {
            return AccessToken.of("access-token:%d:%s:%s".formatted(userId, role, slug));
        }

        @Override
        public AccessTokenClaims parse(String accessToken) {
            return AccessTokenClaims.of(
                    1L,
                    GlobalRole.USER,
                    "jinriro",
                    Instant.parse("2026-08-13T00:00:00Z"),
                    Instant.parse("2026-08-13T00:15:00Z")
            );
        }
    }
}
