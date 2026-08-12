package kr.rilog.global.exception;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class AuthExceptionTest {

    @Test
    @DisplayName("인증 오류는 인증 실패와 권한 부족 상태를 구분한다.")
    void authenticationErrorsKeepUnauthorizedAndForbiddenDistinct() {
        // given
        AuthErrorInformation missingTokenInformation =
                AuthErrorInformation.MISSING_ACCESS_TOKEN;
        AuthErrorInformation insufficientRoleInformation =
                AuthErrorInformation.INSUFFICIENT_ROLE;

        // when
        AuthException missingToken = new AuthException(
                missingTokenInformation
        );
        AuthException insufficientRole = new AuthException(
                insufficientRoleInformation
        );

        // then
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
    @DisplayName("사용자 slug가 없으면 충돌 상태를 사용한다.")
    void missingSlugUsesConflictStatus() {
        // given
        AuthErrorInformation information = AuthErrorInformation.USER_SLUG_NOT_ASSIGNED;

        // when
        AuthException exception = new AuthException(
                information
        );

        // then
        assertEquals(
                HttpStatus.CONFLICT,
                exception.getErrorInformation().getHttpStatus()
        );
    }

}
