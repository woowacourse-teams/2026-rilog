package kr.rilog.domain.therilog.exception;

import kr.rilog.global.exception.ErrorInformation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum TheRilogTaskErrorInformation implements ErrorInformation {

    INVALID_THE_RILOG_TASK_INPUT(HttpStatus.BAD_REQUEST, "더 리로그 제작 요청의 필수 입력이 올바르지 않습니다.");

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public String getErrorCode() {
        return name();
    }
}
