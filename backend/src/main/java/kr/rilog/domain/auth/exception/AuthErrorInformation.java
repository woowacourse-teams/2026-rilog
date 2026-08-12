package kr.rilog.domain.auth.exception;

import kr.rilog.global.exception.ErrorInformation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum AuthErrorInformation implements ErrorInformation {

    GITHUB_OAUTH_CALLBACK_PARAMETER_MISSING(HttpStatus.BAD_REQUEST, "GitHub OAuth callback 요청 값이 올바르지 않습니다."),
    INVALID_GITHUB_OAUTH_STATE(HttpStatus.BAD_REQUEST, "GitHub OAuth state가 유효하지 않습니다."),
    GITHUB_OAUTH_REQUEST_FAILED(HttpStatus.BAD_REQUEST, "GitHub OAuth 인증 요청이 실패했습니다."),
    GITHUB_OAUTH_CONFIGURATION_INVALID(HttpStatus.INTERNAL_SERVER_ERROR, "GitHub OAuth 설정이 올바르지 않습니다."),
    ;

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public String getErrorCode() {
        return this.name();
    }

}
