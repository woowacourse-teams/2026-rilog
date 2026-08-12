package kr.rilog.domain.user.exception;

import kr.rilog.global.exception.ErrorInformation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum UserErrorInformation implements ErrorInformation {

    ONBOARDING_ALREADY_COMPLETED(HttpStatus.BAD_REQUEST, "이미 온보딩을 완료한 사용자입니다."),
    ;

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public String getErrorCode() {
        return this.name();
    }
}
