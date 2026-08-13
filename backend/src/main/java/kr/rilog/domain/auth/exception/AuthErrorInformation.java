package kr.rilog.domain.auth.exception;

import kr.rilog.global.exception.ErrorInformation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum AuthErrorInformation implements ErrorInformation {

    OAUTH_CALLBACK_PARAMETER_MISSING(HttpStatus.BAD_REQUEST, "OAuth callback 요청 값이 올바르지 않습니다."),
    INVALID_OAUTH_STATE(HttpStatus.BAD_REQUEST, "OAuth state가 유효하지 않습니다."),
    OAUTH_REQUEST_FAILED(HttpStatus.BAD_REQUEST, "OAuth 인증 요청이 실패했습니다."),
    OAUTH_PROVIDER_UNSUPPORTED(HttpStatus.BAD_REQUEST, "지원하지 않는 OAuth provider입니다."),

    GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED(HttpStatus.BAD_GATEWAY, "GitHub Access Token 교환에 실패했습니다."),
    GITHUB_USER_FETCH_FAILED(HttpStatus.BAD_GATEWAY, "GitHub 사용자 정보 조회에 실패했습니다."),
    GITHUB_OAUTH_CONFIGURATION_INVALID(HttpStatus.INTERNAL_SERVER_ERROR, "GitHub OAuth 설정이 올바르지 않습니다."),

    INVALID_ACCESS_TOKEN(HttpStatus.UNAUTHORIZED, "Access Token이 유효하지 않습니다."),
    EXPIRED_ACCESS_TOKEN(HttpStatus.UNAUTHORIZED, "Access Token이 만료되었습니다."),
    ACCESS_TOKEN_CLAIM_MISSING(HttpStatus.UNAUTHORIZED, "Access Token 필수 정보가 누락되었습니다."),
    ACCESS_TOKEN_CONFIGURATION_INVALID(HttpStatus.INTERNAL_SERVER_ERROR, "Access Token 설정이 올바르지 않습니다."),
    ;

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public String getErrorCode() {
        return this.name();
    }

}
