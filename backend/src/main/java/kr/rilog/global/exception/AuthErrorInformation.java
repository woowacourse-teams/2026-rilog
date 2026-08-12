package kr.rilog.global.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum AuthErrorInformation implements ErrorInformation {

    MISSING_ACCESS_TOKEN(
            HttpStatus.UNAUTHORIZED,
            "Access token이 필요합니다."
    ),
    INVALID_ACCESS_TOKEN(
            HttpStatus.UNAUTHORIZED,
            "Access token이 유효하지 않습니다."
    ),
    INSUFFICIENT_ROLE(
            HttpStatus.FORBIDDEN,
            "요청한 작업을 수행할 권한이 없습니다."
    ),
    INVALID_REFRESH_TOKEN(
            HttpStatus.UNAUTHORIZED,
            "Refresh token이 유효하지 않습니다."
    ),
    INVALID_EXCHANGE_CODE(
            HttpStatus.UNAUTHORIZED,
            "로그인 교환 code가 유효하지 않습니다."
    ),
    USER_SLUG_NOT_ASSIGNED(
            HttpStatus.CONFLICT,
            "온보딩을 완료한 뒤 사용할 수 있습니다."
    ),
    INVALID_OAUTH_REQUEST(
            HttpStatus.BAD_REQUEST,
            "OAuth 요청이 유효하지 않습니다."
    ),
    UNTRUSTED_ORIGIN(
            HttpStatus.FORBIDDEN,
            "허용되지 않은 Origin입니다."
    ),
    GITHUB_OAUTH_FAILED(
            HttpStatus.BAD_GATEWAY,
            "GitHub 인증을 완료할 수 없습니다."
    );

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public String getErrorCode() {
        return this.name();
    }

}
