package kr.rilog.auth.domain;

import static java.time.temporal.ChronoUnit.DAYS;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RefreshSessionTest {

    private static final Instant NOW = Instant.parse("2026-08-12T00:00:00Z");
    private static final UUID FIRST_ID = UUID.fromString("00000000-0000-0000-0000-000000000001");
    private static final UUID SECOND_ID = UUID.fromString("00000000-0000-0000-0000-000000000002");
    private static final UUID THIRD_ID = UUID.fromString("00000000-0000-0000-0000-000000000003");

    @Test
    void rotatesCurrentUnusedTokenWithoutExtendingAbsoluteExpiry() {
        Instant absoluteExpiry = NOW.plus(30, DAYS);
        RefreshSession session = RefreshSession.start(7L, FIRST_ID, absoluteExpiry);
        RefreshTokenRecord first = RefreshTokenRecord.issue(
                FIRST_ID, session.getId(), "hash-1", NOW
        );

        RotationResult result = session.rotate(
                first, "hash-1", SECOND_ID, NOW.plusSeconds(1), Duration.ofSeconds(4)
        );

        assertEquals(RotationResult.ROTATED, result);
        assertEquals(SECOND_ID, session.getCurrentTokenId());
        assertEquals(absoluteExpiry, session.getAbsoluteExpiresAt());
        assertEquals(SECOND_ID, first.getReplacedByTokenId());
        assertTrue(first.wasUsed());
    }

    @Test
    void justUsedTokenWithinGraceIsConcurrentRequest() {
        RefreshSession session = RefreshSession.start(7L, FIRST_ID, NOW.plus(30, DAYS));
        RefreshTokenRecord first = RefreshTokenRecord.issue(
                FIRST_ID, session.getId(), "hash-1", NOW
        );
        session.rotate(first, "hash-1", SECOND_ID, NOW, Duration.ofSeconds(4));

        RotationResult result = session.rotate(
                first, "hash-1", THIRD_ID, NOW.plusSeconds(4), Duration.ofSeconds(4)
        );

        assertEquals(RotationResult.CONCURRENT_REQUEST, result);
        assertFalse(session.isRevoked());
        assertEquals(SECOND_ID, session.getCurrentTokenId());
    }

    @Test
    void usedTokenOutsideGraceRevokesWholeSession() {
        RefreshSession session = RefreshSession.start(7L, FIRST_ID, NOW.plus(30, DAYS));
        RefreshTokenRecord first = RefreshTokenRecord.issue(
                FIRST_ID, session.getId(), "hash-1", NOW
        );
        session.rotate(first, "hash-1", SECOND_ID, NOW, Duration.ofSeconds(4));

        RotationResult result = session.rotate(
                first, "hash-1", THIRD_ID, NOW.plusSeconds(5), Duration.ofSeconds(4)
        );

        assertEquals(RotationResult.REUSE_DETECTED, result);
        assertTrue(session.isRevoked());
        assertEquals(NOW.plusSeconds(5), session.getReuseDetectedAt());
    }

    @Test
    void wrongSecretDoesNotRevokeKnownSession() {
        RefreshSession session = RefreshSession.start(7L, FIRST_ID, NOW.plus(30, DAYS));
        RefreshTokenRecord first = RefreshTokenRecord.issue(
                FIRST_ID, session.getId(), "hash-1", NOW
        );

        RotationResult result = session.rotate(
                first, "wrong-hash", SECOND_ID, NOW, Duration.ofSeconds(4)
        );

        assertEquals(RotationResult.INVALID_CREDENTIAL, result);
        assertFalse(session.isRevoked());
        assertEquals(FIRST_ID, session.getCurrentTokenId());
    }

    @Test
    void expiredAndRevokedSessionsNeverRotate() {
        RefreshSession expired = RefreshSession.start(7L, FIRST_ID, NOW);
        RefreshTokenRecord token = RefreshTokenRecord.issue(
                FIRST_ID, expired.getId(), "hash-1", NOW.minusSeconds(1)
        );
        RefreshSession revoked = RefreshSession.start(7L, FIRST_ID, NOW.plus(30, DAYS));
        revoked.revoke(NOW);

        assertEquals(RotationResult.EXPIRED,
                expired.rotate(token, "hash-1", SECOND_ID, NOW, Duration.ofSeconds(4)));
        assertEquals(RotationResult.REVOKED,
                revoked.rotate(token, "hash-1", SECOND_ID, NOW, Duration.ofSeconds(4)));
    }
}
