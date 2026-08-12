package kr.rilog.auth.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class LoginExchangeCodeTest {

    private static final Instant NOW = Instant.parse("2026-08-12T00:00:00Z");

    @Test
    void matchingCodeIsConsumedOnlyOnce() {
        LoginExchangeCode code = LoginExchangeCode.issue(
                7L, "secret-hash", NOW.plusSeconds(90)
        );

        assertEquals(7L, code.consume("secret-hash", NOW));
        assertThrows(AuthDomainException.class,
                () -> code.consume("secret-hash", NOW.plusSeconds(1)));
    }

    @Test
    void rejectsWrongOrExpiredSecret() {
        LoginExchangeCode valid = LoginExchangeCode.issue(
                7L, "secret-hash", NOW.plusSeconds(90)
        );
        LoginExchangeCode expired = LoginExchangeCode.issue(
                7L, "secret-hash", NOW
        );

        assertThrows(AuthDomainException.class,
                () -> valid.consume("wrong-hash", NOW));
        assertThrows(AuthDomainException.class,
                () -> expired.consume("secret-hash", NOW));
    }
}
