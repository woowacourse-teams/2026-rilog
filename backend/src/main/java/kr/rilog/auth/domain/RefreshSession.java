package kr.rilog.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "refresh_session",
        indexes = {
                @Index(name = "idx_refresh_session_user_id", columnList = "user_id"),
                @Index(
                        name = "idx_refresh_session_absolute_expires_at",
                        columnList = "absolute_expires_at"
                ),
                @Index(name = "idx_refresh_session_revoked_at", columnList = "revoked_at")
        }
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshSession {

    @Id
    private UUID id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false)
    private UUID currentTokenId;

    @Column(nullable = false)
    private Instant absoluteExpiresAt;

    private Instant revokedAt;
    private Instant reuseDetectedAt;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    private RefreshSession(
            UUID id,
            Long userId,
            UUID currentTokenId,
            Instant absoluteExpiresAt,
            Instant createdAt
    ) {
        this.id = id;
        this.userId = userId;
        this.currentTokenId = currentTokenId;
        this.absoluteExpiresAt = absoluteExpiresAt;
        this.createdAt = createdAt;
        this.updatedAt = createdAt;
    }

    public static RefreshSession start(
            Long userId,
            UUID initialTokenId,
            Instant absoluteExpiresAt
    ) {
        return start(userId, initialTokenId, absoluteExpiresAt, Instant.now());
    }

    public static RefreshSession start(
            Long userId,
            UUID initialTokenId,
            Instant absoluteExpiresAt,
            Instant now
    ) {
        return new RefreshSession(
                UUID.randomUUID(), userId, initialTokenId, absoluteExpiresAt, now
        );
    }

    public RotationResult rotate(
            RefreshTokenRecord record,
            String presentedHash,
            UUID nextTokenId,
            Instant now,
            Duration grace
    ) {
        if (revokedAt != null) {
            return RotationResult.REVOKED;
        }
        if (!now.isBefore(absoluteExpiresAt)) {
            return RotationResult.EXPIRED;
        }
        if (!id.equals(record.getSessionId()) || !record.matches(presentedHash)) {
            return RotationResult.INVALID_CREDENTIAL;
        }
        if (record.wasUsed()) {
            if (record.isConcurrent(currentTokenId, now)) {
                return RotationResult.CONCURRENT_REQUEST;
            }
            detectReuse(now);
            return RotationResult.REUSE_DETECTED;
        }
        if (!record.getId().equals(currentTokenId)) {
            detectReuse(now);
            return RotationResult.REUSE_DETECTED;
        }
        record.markUsed(nextTokenId, now, grace);
        currentTokenId = nextTokenId;
        updatedAt = now;
        return RotationResult.ROTATED;
    }

    public void revoke(Instant now) {
        if (revokedAt == null) {
            revokedAt = now;
            updatedAt = now;
        }
    }

    public void detectReuse(Instant now) {
        if (reuseDetectedAt == null) {
            reuseDetectedAt = now;
        }
        revoke(now);
    }

    public boolean isRevoked() {
        return revokedAt != null;
    }

}
