package kr.rilog.domain.therilog.exception;

import kr.rilog.global.exception.ErrorInformation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum TheRilogPublicationErrorInformation implements ErrorInformation {

    INVALID_THE_RILOG_PUBLICATION(HttpStatus.BAD_REQUEST, "더 리로그 발행분의 입력이 올바르지 않습니다.");

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public String getErrorCode() {
        return name();
    }
}
