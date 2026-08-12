package kr.rilog.auth.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.time.Instant;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

class LoginExchangeCodeTest {

    private static final Instant NOW = Instant.parse("2026-08-12T00:00:00Z");

    @Test
    @DisplayName("일치하는 로그인 교환 코드는 한 번만 소비할 수 있다.")
    void matchingCodeIsConsumedOnlyOnce() {
        // given
        LoginExchangeCode code = LoginExchangeCode.issue(
                7L, "secret-hash", NOW.plusSeconds(90)
        );

        // when
        long userId = code.consume("secret-hash", NOW);
        Executable consumeAgain = () -> code.consume(
                "secret-hash",
                NOW.plusSeconds(1)
        );

        // then
        assertEquals(7L, userId);
        assertThrows(AuthDomainException.class, consumeAgain);
    }

    @Test
    @DisplayName("시크릿이 다르거나 만료된 로그인 교환 코드는 거부한다.")
    void rejectsWrongOrExpiredSecret() {
        // given
        LoginExchangeCode valid = LoginExchangeCode.issue(
                7L, "secret-hash", NOW.plusSeconds(90)
        );
        LoginExchangeCode expired = LoginExchangeCode.issue(
                7L, "secret-hash", NOW
        );

        // when
        Executable consumeWithWrongSecret = () -> valid.consume("wrong-hash", NOW);
        Executable consumeExpired = () -> expired.consume("secret-hash", NOW);

        // then
        assertThrows(AuthDomainException.class, consumeWithWrongSecret);
        assertThrows(AuthDomainException.class, consumeExpired);
    }

}
