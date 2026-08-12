package kr.rilog.global.exception;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class AuthExceptionTest {

    @Test
    void authenticationErrorsKeepUnauthorizedAndForbiddenDistinct() {
        AuthException missingToken = new AuthException(
                AuthErrorInformation.MISSING_ACCESS_TOKEN
        );
        AuthException insufficientRole = new AuthException(
                AuthErrorInformation.INSUFFICIENT_ROLE
        );

        assertAll(
                () -> assertEquals(
                        HttpStatus.UNAUTHORIZED,
                        missingToken.getErrorInformation().getHttpStatus()
                ),
                () -> assertEquals(
                        "AUTH_001",
                        missingToken.getErrorInformation().getErrorCode()
                ),
                () -> assertEquals(
                        HttpStatus.FORBIDDEN,
                        insufficientRole.getErrorInformation().getHttpStatus()
                ),
                () -> assertEquals(
                        "AUTH_003",
                        insufficientRole.getErrorInformation().getErrorCode()
                )
        );
    }

    @Test
    void missingSlugUsesConflictStatus() {
        AuthException exception = new AuthException(
                AuthErrorInformation.USER_SLUG_NOT_ASSIGNED
        );

        assertEquals(
                HttpStatus.CONFLICT,
                exception.getErrorInformation().getHttpStatus()
        );
    }
}
