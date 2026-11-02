package kr.rilog.global.idempotency.exception;

import kr.rilog.global.exception.ErrorInformation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum IdempotencyErrorInformation implements ErrorInformation {

    INVALID_IDEMPOTENCY_KEY(HttpStatus.BAD_REQUEST, "멱등키는 UUID 형식이어야 합니다."),
    ;

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public String getErrorCode() {
        return this.name();
    }

}
