package kr.rilog.global.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum GlobalExceptionInformation implements ErrorInformation {

    INVALID_REQUEST_BODY(HttpStatus.BAD_REQUEST, "COMMON_001", "요청 본문 형식이 올바르지 않습니다."),
    METHOD_NOT_SUPPORTED(HttpStatus.METHOD_NOT_ALLOWED, "COMMON_002", "지원하지 않는 HTTP 메서드입니다."),
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "COMMON_003", "해당 요청을 처리할 수 없습니다."),
    INTERNAL_SERVER_ERROR(HttpStatus.BAD_REQUEST, "COMMON_004", "서버 내부 오류가 발생했습니다."),
    INVALID_ARGUMENT(HttpStatus.BAD_REQUEST, "COMMON_005", "요청 값이 올바르지 않습니다."),
    REQUEST_VALIDATION_FAILED(HttpStatus.BAD_REQUEST, "COMMON_006", "요청 값 검증에 실패했습니다."),
    DATA_INTEGRITY_VIOLATION(HttpStatus.BAD_REQUEST, "COMMON_007", "해당 요청을 처리할 수 없습니다."),
    DATA_NOT_DUPLICATED_KEY(HttpStatus.BAD_REQUEST, "COMMON_008", "유니크 제약 조건 예외 발생"),
    ;

    private final HttpStatus httpStatus;
    private final String errorCode;
    private final String message;

}
