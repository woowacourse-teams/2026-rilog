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
    INVALID_OAUTH_REDIRECT_URL(HttpStatus.BAD_REQUEST, "OAuth redirectUrl은 서비스 내부 경로여야 합니다."),
    OAUTH_REQUEST_FAILED(HttpStatus.BAD_REQUEST, "OAuth 인증 요청이 실패했습니다."),
    OAUTH_PROVIDER_UNSUPPORTED(HttpStatus.BAD_REQUEST, "지원하지 않는 OAuth provider입니다."),

    GITHUB_ACCESS_TOKEN_EXCHANGE_FAILED(HttpStatus.BAD_GATEWAY, "GitHub Access Token 교환에 실패했습니다."),
    GITHUB_USER_FETCH_FAILED(HttpStatus.BAD_GATEWAY, "GitHub 사용자 정보 조회에 실패했습니다."),
    GITHUB_OAUTH_CONFIGURATION_INVALID(HttpStatus.INTERNAL_SERVER_ERROR, "GitHub OAuth 설정이 올바르지 않습니다."),

    INVALID_ACCESS_TOKEN(HttpStatus.UNAUTHORIZED, "Access Token이 유효하지 않습니다."),
    EXPIRED_ACCESS_TOKEN(HttpStatus.UNAUTHORIZED, "Access Token이 만료되었습니다."),
    ACCESS_TOKEN_CLAIM_MISSING(HttpStatus.UNAUTHORIZED, "Access Token 필수 정보가 누락되었습니다."),
    ACCESS_TOKEN_CONFIGURATION_INVALID(HttpStatus.INTERNAL_SERVER_ERROR, "Access Token 설정이 올바르지 않습니다."),
    INVALID_ONBOARDING_TOKEN(HttpStatus.UNAUTHORIZED, "Onboarding Token이 유효하지 않습니다."),
    EXPIRED_ONBOARDING_TOKEN(HttpStatus.UNAUTHORIZED, "Onboarding Token이 만료되었습니다."),
    ONBOARDING_TOKEN_CLAIM_MISSING(HttpStatus.UNAUTHORIZED, "Onboarding Token 필수 정보가 누락되었습니다."),
    ONBOARDING_TOKEN_CONFIGURATION_INVALID(HttpStatus.INTERNAL_SERVER_ERROR, "Onboarding Token 설정이 올바르지 않습니다."),
    REFRESH_TOKEN_MISSING(HttpStatus.UNAUTHORIZED, "Refresh Token이 필요합니다."),
    INVALID_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "Refresh Token이 유효하지 않습니다."),
    EXPIRED_REFRESH_TOKEN(HttpStatus.UNAUTHORIZED, "Refresh Token이 만료되었습니다."),
    AUTHORIZATION_HEADER_MISSING(HttpStatus.UNAUTHORIZED, "Authorization 헤더가 필요합니다."),
    INVALID_AUTHORIZATION_HEADER(HttpStatus.UNAUTHORIZED, "Authorization 헤더 형식이 올바르지 않습니다."),
    AUTHENTICATION_CONTEXT_MISSING(HttpStatus.UNAUTHORIZED, "인증 사용자 정보가 없습니다."),
    AUTHENTICATION_ANNOTATION_MISSING(HttpStatus.INTERNAL_SERVER_ERROR, "인증 사용자 주입을 위해서는 @AuthGuard 선언이 필요합니다."),
    AUTHORIZATION_FAILED(HttpStatus.FORBIDDEN, "접근 권한이 없습니다."),
    ;

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public String getErrorCode() {
        return this.name();
    }

}
