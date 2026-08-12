package kr.rilog.auth.domain;

import static java.time.temporal.ChronoUnit.DAYS;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class RefreshSessionTest {

    private static final Instant NOW = Instant.parse("2026-08-12T00:00:00Z");
    private static final UUID FIRST_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID SECOND_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private static final UUID THIRD_ID = UUID.fromString("00000000-0000-0000-0000-000000000003");

    @Test
    @DisplayName("현재 사용하지 않은 리프레시 토큰은 절대 만료일을 연장하지 않고 교체한다.")
    void rotatesCurrentUnusedTokenWithoutExtendingAbsoluteExpiry() {
        // given
        Instant absoluteExpiry = NOW.plus(30, DAYS);
        RefreshSession session = RefreshSession.start(7L, FIRST_ID, absoluteExpiry);
        RefreshTokenRecord first = RefreshTokenRecord.issue(
                FIRST_ID, session.getId(), "hash-1", NOW
        );

        // when
        RotationResult result = session.rotate(
                first, "hash-1", SECOND_ID, NOW.plusSeconds(1), Duration.ofSeconds(4)
        );

        // then
        assertEquals(RotationResult.ROTATED, result);
        assertEquals(SECOND_ID, session.getCurrentTokenId());
        assertEquals(absoluteExpiry, session.getAbsoluteExpiresAt());
        assertEquals(SECOND_ID, first.getReplacedByTokenId());
        assertTrue(first.wasUsed());
    }

    @Test
    @DisplayName("Grace 시간 안에 재사용된 리프레시 토큰은 동시 요청으로 처리한다.")
    void justUsedTokenWithinGraceIsConcurrentRequest() {
        // given
        RefreshSession session = RefreshSession.start(7L, FIRST_ID, NOW.plus(30, DAYS));
        RefreshTokenRecord first = RefreshTokenRecord.issue(
                FIRST_ID, session.getId(), "hash-1", NOW
        );
        session.rotate(first, "hash-1", SECOND_ID, NOW, Duration.ofSeconds(4));

        // when
        RotationResult result = session.rotate(
                first, "hash-1", THIRD_ID, NOW.plusSeconds(4), Duration.ofSeconds(4)
        );

        // then
        assertEquals(RotationResult.CONCURRENT_REQUEST, result);
        assertFalse(session.isRevoked());
        assertEquals(SECOND_ID, session.getCurrentTokenId());
    }

    @Test
    @DisplayName("Grace 시간이 지난 리프레시 토큰 재사용은 전체 세션을 폐기한다.")
    void usedTokenOutsideGraceRevokesWholeSession() {
        // given
        RefreshSession session = RefreshSession.start(7L, FIRST_ID, NOW.plus(30, DAYS));
        RefreshTokenRecord first = RefreshTokenRecord.issue(
                FIRST_ID, session.getId(), "hash-1", NOW
        );
        session.rotate(first, "hash-1", SECOND_ID, NOW, Duration.ofSeconds(4));

        // when
        RotationResult result = session.rotate(
                first, "hash-1", THIRD_ID, NOW.plusSeconds(5), Duration.ofSeconds(4)
        );

        // then
        assertEquals(RotationResult.REUSE_DETECTED, result);
        assertTrue(session.isRevoked());
        assertEquals(NOW.plusSeconds(5), session.getReuseDetectedAt());
    }

    @Test
    @DisplayName("시크릿이 다른 리프레시 토큰은 알려진 세션을 폐기하지 않는다.")
    void wrongSecretDoesNotRevokeKnownSession() {
        // given
        RefreshSession session = RefreshSession.start(7L, FIRST_ID, NOW.plus(30, DAYS));
        RefreshTokenRecord first = RefreshTokenRecord.issue(
                FIRST_ID, session.getId(), "hash-1", NOW
        );

        // when
        RotationResult result = session.rotate(
                first, "wrong-hash", SECOND_ID, NOW, Duration.ofSeconds(4)
        );

        // then
        assertEquals(RotationResult.INVALID_CREDENTIAL, result);
        assertFalse(session.isRevoked());
        assertEquals(FIRST_ID, session.getCurrentTokenId());
    }

    @Test
    @DisplayName("만료되거나 폐기된 리프레시 세션은 토큰을 교체하지 않는다.")
    void expiredAndRevokedSessionsNeverRotate() {
        // given
        RefreshSession expired = RefreshSession.start(7L, FIRST_ID, NOW);
        RefreshTokenRecord token = RefreshTokenRecord.issue(
                FIRST_ID, expired.getId(), "hash-1", NOW.minusSeconds(1)
        );
        RefreshSession revoked = RefreshSession.start(7L, FIRST_ID, NOW.plus(30, DAYS));
        revoked.revoke(NOW);

        // when
        RotationResult expiredResult = expired.rotate(
                token, "hash-1", SECOND_ID, NOW, Duration.ofSeconds(4)
        );
        RotationResult revokedResult = revoked.rotate(
                token, "hash-1", SECOND_ID, NOW, Duration.ofSeconds(4)
        );

        // then
        assertEquals(RotationResult.EXPIRED, expiredResult);
        assertEquals(RotationResult.REVOKED, revokedResult);
    }

}
