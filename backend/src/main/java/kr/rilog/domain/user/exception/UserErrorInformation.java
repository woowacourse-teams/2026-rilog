package kr.rilog.domain.user.exception;

import kr.rilog.global.exception.ErrorInformation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum UserErrorInformation implements ErrorInformation {

    ONBOARDING_ALREADY_COMPLETED(HttpStatus.BAD_REQUEST, "이미 온보딩을 완료한 사용자입니다."),
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "사용자를 찾을 수 없습니다."),
    INVALID_NICKNAME(HttpStatus.BAD_REQUEST, "사용할 수 없는 닉네임입니다."),
    INVALID_SLUG(HttpStatus.BAD_REQUEST, "사용할 수 없는 슬러그입니다."),
    INVALID_EMAIL(HttpStatus.BAD_REQUEST, "사용할 수 없는 이메일입니다."),
    NICKNAME_DUPLICATED(HttpStatus.NOT_FOUND, "중복되는 닉네임입니다."),
    SLUG_DUPLICATED(HttpStatus.NOT_FOUND, "중복되는 슬러그입니다."),
    ;

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public String getErrorCode() {
        return this.name();
    }
}
