package kr.rilog.auth.infrastructure.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.UUID;
import kr.rilog.auth.application.port.IssuedCredential;
import kr.rilog.auth.application.port.ParsedCredential;
import kr.rilog.auth.application.port.SecureCredentialService;
import org.springframework.stereotype.Component;

@Component
public class SecureCredentialManager implements SecureCredentialService {

    private static final int SECRET_BYTES = 32;

    private final SecureRandom secureRandom;

    public SecureCredentialManager() {
        this(new SecureRandom());
    }

    SecureCredentialManager(SecureRandom secureRandom) {
        this.secureRandom = secureRandom;
    }

    @Override
    public IssuedCredential issueCredential() {
        UUID id = UUID.randomUUID();
        String secret = issueSecret();
        return new IssuedCredential(id, id + "." + secret, hash(secret));
    }

    @Override
    public String issueSecret() {
        byte[] random = new byte[SECRET_BYTES];
        secureRandom.nextBytes(random);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(random);
    }

    @Override
    public String hash(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            throw new IllegalArgumentException("Value to hash must not be blank");
        }
        return Base64.getUrlEncoder().withoutPadding().encodeToString(
                sha256(rawValue.getBytes(StandardCharsets.UTF_8))
        );
    }

    @Override
    public ParsedCredential parse(String credential) {
        if (credential == null || credential.isBlank()) {
            throw new IllegalArgumentException("Credential must not be blank");
        }
        int separator = credential.indexOf('.');
        if (separator <= 0
                || separator != credential.lastIndexOf('.')
                || separator == credential.length() - 1) {
            throw new IllegalArgumentException("Credential format is invalid");
        }
        UUID id;
        try {
            id = UUID.fromString(credential.substring(0, separator));
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException("Credential public ID is invalid", exception);
        }
        return new ParsedCredential(id, hash(credential.substring(separator + 1)));
    }

    @Override
    public String pkceChallenge(String verifier) {
        if (verifier == null || verifier.isBlank()) {
            throw new IllegalArgumentException("PKCE verifier must not be blank");
        }
        return Base64.getUrlEncoder().withoutPadding().encodeToString(
                sha256(verifier.getBytes(StandardCharsets.US_ASCII))
        );
    }

    private byte[] sha256(byte[] value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value);
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 must be available", exception);
        }
    }
}
