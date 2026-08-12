package kr.rilog.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(
        name = "login_exchange_code",
        indexes = @Index(
                name = "idx_login_exchange_code_expires_at",
                columnList = "expires_at"
        )
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class LoginExchangeCode {

    @Id
    private UUID id;

    @Column(nullable = false)
    private Long userId;

    @Column(nullable = false, length = 64)
    private String secretHash;

    @Column(nullable = false)
    private Instant expiresAt;

    private Instant consumedAt;

    private LoginExchangeCode(UUID id, Long userId, String secretHash, Instant expiresAt) {
        this.id = id;
        this.userId = userId;
        this.secretHash = secretHash;
        this.expiresAt = expiresAt;
    }

    public static LoginExchangeCode issue(Long userId, String secretHash, Instant expiresAt) {
        return new LoginExchangeCode(UUID.randomUUID(), userId, secretHash, expiresAt);
    }

    public static LoginExchangeCode issue(
            UUID id,
            Long userId,
            String secretHash,
            Instant expiresAt
    ) {
        return new LoginExchangeCode(id, userId, secretHash, expiresAt);
    }

    public Long consume(String presentedHash, Instant now) {
        if (consumedAt != null) {
            throw new AuthDomainException("Login exchange code was already consumed");
        }
        if (!now.isBefore(expiresAt)) {
            throw new AuthDomainException("Login exchange code has expired");
        }
        if (!SecretHashes.matches(secretHash, presentedHash)) {
            throw new AuthDomainException("Login exchange code does not match");
        }
        consumedAt = now;
        return userId;
    }

}
