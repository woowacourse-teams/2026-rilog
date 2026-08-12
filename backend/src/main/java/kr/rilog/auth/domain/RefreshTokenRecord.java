package kr.rilog.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "refresh_token_record")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshTokenRecord {

    @Id
    private UUID id;

    @Column(nullable = false)
    private UUID sessionId;

    @Column(nullable = false, length = 64)
    private String secretHash;

    @Column(nullable = false)
    private Instant issuedAt;

    private Instant usedAt;
    private Instant concurrencyGraceUntil;
    private UUID replacedByTokenId;

    private RefreshTokenRecord(UUID id, UUID sessionId, String secretHash, Instant issuedAt) {
        this.id = id;
        this.sessionId = sessionId;
        this.secretHash = secretHash;
        this.issuedAt = issuedAt;
    }

    public static RefreshTokenRecord issue(
            UUID id,
            UUID sessionId,
            String secretHash,
            Instant issuedAt
    ) {
        return new RefreshTokenRecord(id, sessionId, secretHash, issuedAt);
    }

    public boolean matches(String presentedHash) {
        return SecretHashes.matches(secretHash, presentedHash);
    }

    public boolean wasUsed() {
        return usedAt != null;
    }

    public boolean isConcurrent(UUID currentTokenId, Instant now) {
        return wasUsed()
                && replacedByTokenId != null
                && replacedByTokenId.equals(currentTokenId)
                && concurrencyGraceUntil != null
                && !now.isAfter(concurrencyGraceUntil);
    }

    void markUsed(UUID replacementTokenId, Instant now, Duration grace) {
        usedAt = now;
        concurrencyGraceUntil = now.plus(grace);
        replacedByTokenId = replacementTokenId;
    }
}
