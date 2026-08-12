package kr.rilog.auth.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import kr.rilog.auth.application.port.IssuedCredential;
import kr.rilog.auth.application.port.ParsedCredential;
import org.junit.jupiter.api.Test;

class SecureCredentialManagerTest {

    private final SecureCredentialManager manager = new SecureCredentialManager();

    @Test
    void issuedCredentialContainsPublicIdAndUnrecoverableSecretHash() {
        IssuedCredential issued = manager.issueCredential();
        ParsedCredential parsed = manager.parse(issued.value());

        assertAll(
                () -> assertEquals(issued.id(), parsed.id()),
                () -> assertEquals(issued.secretHash(), parsed.secretHash()),
                () -> assertNotEquals(issued.value(), issued.secretHash()),
                () -> assertFalse(issued.value().endsWith(issued.secretHash()))
        );
    }

    @Test
    void malformedOpaqueCredentialIsRejected() {
        assertThrows(IllegalArgumentException.class, () -> manager.parse("missing-dot"));
        assertThrows(IllegalArgumentException.class, () -> manager.parse("bad-id.secret"));
        assertThrows(IllegalArgumentException.class, () -> manager.parse("id."));
    }

    @Test
    void pkceChallengeUsesS256Base64UrlWithoutPadding() {
        assertEquals(
                "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
                manager.pkceChallenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk")
        );
    }
}
