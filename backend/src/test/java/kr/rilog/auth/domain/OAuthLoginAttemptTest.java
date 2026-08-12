package kr.rilog.auth.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

class OAuthLoginAttemptTest {

    private static final Instant NOW = Instant.parse("2026-08-12T00:00:00Z");

    @Test
    @DisplayName("브라우저 바인딩이 일치하는 OAuth 로그인 시도는 한 번만 소비할 수 있다.")
    void consumesAttemptOnlyOnceWithMatchingBrowserBinding() {
        // given
        OAuthLoginAttempt attempt = OAuthLoginAttempt.issue(
                "state-hash",
                "binding-hash",
                "pkce-verifier",
                NOW.plusSeconds(600)
        );

        // when
        String pkceVerifier = attempt.consume("binding-hash", NOW);
        Executable consumeAgain = () -> attempt.consume(
                "binding-hash",
                NOW.plusSeconds(1)
        );

        // then
        assertEquals("pkce-verifier", pkceVerifier);
        assertThrows(OAuthAttemptException.class, consumeAgain);
    }

    @Test
    @DisplayName("만료되었거나 브라우저 바인딩이 다른 OAuth 로그인 시도는 거부한다.")
    void rejectsExpiredAttemptAndWrongBrowserBinding() {
        // given
        OAuthLoginAttempt expired = OAuthLoginAttempt.issue(
                "state-hash-1", "binding-hash", "verifier", NOW
        );
        OAuthLoginAttempt wrongBrowser = OAuthLoginAttempt.issue(
                "state-hash-2", "binding-hash", "verifier", NOW.plusSeconds(600)
        );

        // when
        Executable consumeExpired = () -> expired.consume("binding-hash", NOW);
        Executable consumeFromWrongBrowser = () -> wrongBrowser.consume(
                "another-hash",
                NOW
        );

        // then
        assertThrows(OAuthAttemptException.class, consumeExpired);
        assertThrows(OAuthAttemptException.class, consumeFromWrongBrowser);
    }

}
