package kr.rilog.auth.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Entity
@Table(name = "oauth_login_attempt")
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
            throw new AuthDomainException("OAuth login attempt was already consumed");
        }
        if (!now.isBefore(expiresAt)) {
            throw new AuthDomainException("OAuth login attempt has expired");
        }
        if (!SecretHashes.matches(browserBindingHash, presentedBrowserBindingHash)) {
            throw new AuthDomainException("OAuth browser binding does not match");
        }
        consumedAt = now;
        return pkceVerifier;
    }
}
