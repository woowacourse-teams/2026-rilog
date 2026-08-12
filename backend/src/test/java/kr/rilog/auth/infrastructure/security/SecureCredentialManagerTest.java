package kr.rilog.auth.infrastructure.security;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import kr.rilog.auth.application.port.IssuedCredential;
import kr.rilog.auth.application.port.ParsedCredential;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.function.Executable;

class SecureCredentialManagerTest {

    private final SecureCredentialManager manager = new SecureCredentialManager();

    @Test
    @DisplayName("발급한 credential은 공개 ID와 복구할 수 없는 시크릿 해시를 포함한다.")
    void issuedCredentialContainsPublicIdAndUnrecoverableSecretHash() {
        // given

        // when
        IssuedCredential issued = manager.issueCredential();
        ParsedCredential parsed = manager.parse(issued.value());

        // then
        assertAll(
                () -> assertEquals(issued.id(), parsed.id()),
                () -> assertEquals(issued.secretHash(), parsed.secretHash()),
                () -> assertNotEquals(issued.value(), issued.secretHash()),
                () -> assertFalse(issued.value().endsWith(issued.secretHash()))
        );
    }

    @Test
    @DisplayName("형식이 잘못된 불투명 credential은 거부한다.")
    void malformedOpaqueCredentialIsRejected() {
        // given
        String missingDot = "missing-dot";
        String invalidId = "bad-id.secret";
        String missingSecret = "id.";

        // when
        Executable parseMissingDot = () -> manager.parse(missingDot);
        Executable parseInvalidId = () -> manager.parse(invalidId);
        Executable parseMissingSecret = () -> manager.parse(missingSecret);

        // then
        assertThrows(IllegalArgumentException.class, parseMissingDot);
        assertThrows(IllegalArgumentException.class, parseInvalidId);
        assertThrows(IllegalArgumentException.class, parseMissingSecret);
    }

    @Test
    @DisplayName("PKCE challenge는 패딩 없는 S256 Base64 URL 형식으로 생성한다.")
    void pkceChallengeUsesS256Base64UrlWithoutPadding() {
        // given
        String verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";

        // when
        String challenge = manager.pkceChallenge(verifier);

        // then
        assertEquals(
                "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM",
                challenge
        );
    }

}
