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
        name = "oauth_login_attempt",
        indexes = @Index(
                name = "idx_oauth_login_attempt_expires_at",
                columnList = "expires_at"
        )
)
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class OAuthLoginAttempt {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 64)
    private String stateHash;

    @Column(nullable = false, length = 64)
    private String browserBindingHash;

    @Column(nullable = false, length = 128)
    private String pkceVerifier;

    @Column(nullable = false)
    private Instant expiresAt;

    private Instant consumedAt;

    private OAuthLoginAttempt(
            UUID id,
            String stateHash,
            String browserBindingHash,
            String pkceVerifier,
            Instant expiresAt
    ) {
        this.id = id;
        this.stateHash = stateHash;
        this.browserBindingHash = browserBindingHash;
        this.pkceVerifier = pkceVerifier;
        this.expiresAt = expiresAt;
    }

    public static OAuthLoginAttempt issue(
            String stateHash,
            String browserBindingHash,
            String pkceVerifier,
            Instant expiresAt
    ) {
        return new OAuthLoginAttempt(
                UUID.randomUUID(), stateHash, browserBindingHash, pkceVerifier, expiresAt
        );
    }

    public String consume(String presentedBrowserBindingHash, Instant now) {
        if (consumedAt != null) {
            throw new OAuthAttemptException(OAuthAttemptException.Failure.ALREADY_USED);
        }
        if (!now.isBefore(expiresAt)) {
            throw new OAuthAttemptException(OAuthAttemptException.Failure.EXPIRED);
        }
        if (!SecretHashes.matches(browserBindingHash, presentedBrowserBindingHash)) {
            throw new OAuthAttemptException(
                    OAuthAttemptException.Failure.BROWSER_BINDING_MISMATCH
            );
        }
        consumedAt = now;
        return pkceVerifier;
    }
}
