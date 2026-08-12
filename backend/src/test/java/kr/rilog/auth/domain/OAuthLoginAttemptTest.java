package kr.rilog.auth.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class OAuthLoginAttemptTest {

    private static final Instant NOW = Instant.parse("2026-08-12T00:00:00Z");

    @Test
    void consumesAttemptOnlyOnceWithMatchingBrowserBinding() {
        OAuthLoginAttempt attempt = OAuthLoginAttempt.issue(
                "state-hash",
                "binding-hash",
                "pkce-verifier",
                NOW.plusSeconds(600)
        );

        assertEquals("pkce-verifier", attempt.consume("binding-hash", NOW));
        assertThrows(OAuthAttemptException.class,
                () -> attempt.consume("binding-hash", NOW.plusSeconds(1)));
    }

    @Test
    void rejectsExpiredAttemptAndWrongBrowserBinding() {
        OAuthLoginAttempt expired = OAuthLoginAttempt.issue(
                "state-hash-1", "binding-hash", "verifier", NOW
        );
        OAuthLoginAttempt wrongBrowser = OAuthLoginAttempt.issue(
                "state-hash-2", "binding-hash", "verifier", NOW.plusSeconds(600)
        );

        assertThrows(OAuthAttemptException.class,
                () -> expired.consume("binding-hash", NOW));
        assertThrows(OAuthAttemptException.class,
                () -> wrongBrowser.consume("another-hash", NOW));
    }
}
