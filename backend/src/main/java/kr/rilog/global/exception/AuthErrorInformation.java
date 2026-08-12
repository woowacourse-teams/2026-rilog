package kr.rilog.global.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum AuthErrorInformation implements ErrorInformation {

    MISSING_ACCESS_TOKEN(
            HttpStatus.UNAUTHORIZED,
            "AUTH_001",
            "Access token이 필요합니다."
    ),
    INVALID_ACCESS_TOKEN(
            HttpStatus.UNAUTHORIZED,
            "AUTH_002",
            "Access token이 유효하지 않습니다."
    ),
    INSUFFICIENT_ROLE(
            HttpStatus.FORBIDDEN,
            "AUTH_003",
            "요청한 작업을 수행할 권한이 없습니다."
    ),
    INVALID_REFRESH_TOKEN(
            HttpStatus.UNAUTHORIZED,
            "AUTH_004",
            "Refresh token이 유효하지 않습니다."
    ),
    INVALID_EXCHANGE_CODE(
            HttpStatus.UNAUTHORIZED,
            "AUTH_005",
            "로그인 교환 code가 유효하지 않습니다."
    ),
    USER_SLUG_NOT_ASSIGNED(
            HttpStatus.CONFLICT,
            "AUTH_006",
            "온보딩을 완료한 뒤 사용할 수 있습니다."
    ),
    INVALID_OAUTH_REQUEST(
            HttpStatus.BAD_REQUEST,
            "AUTH_007",
            "OAuth 요청이 유효하지 않습니다."
    ),
    UNTRUSTED_ORIGIN(
            HttpStatus.FORBIDDEN,
            "AUTH_008",
            "허용되지 않은 Origin입니다."
    ),
    GITHUB_OAUTH_FAILED(
            HttpStatus.BAD_GATEWAY,
            "AUTH_009",
            "GitHub 인증을 완료할 수 없습니다."
    );

    private final HttpStatus httpStatus;
    private final String errorCode;
    private final String message;

}
