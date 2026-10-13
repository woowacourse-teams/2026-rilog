package kr.rilog.domain.therilog.exception;

import kr.rilog.global.exception.ErrorInformation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum TheRilogSheetErrorInformation implements ErrorInformation {

    INVALID_THE_RILOG_SHEET_INPUT(HttpStatus.BAD_REQUEST, "더 리로그 시트의 제작 입력이 올바르지 않습니다."),
    INVALID_THE_RILOG_SHEET_RESULT(HttpStatus.BAD_REQUEST, "더 리로그 시트에 기록할 제작 결과가 올바르지 않습니다."),
    THE_RILOG_SHEET_ROW_NOT_FOUND(HttpStatus.NOT_FOUND, "더 리로그 시트에서 해당 행을 찾을 수 없습니다."),
    DUPLICATE_THE_RILOG_SHEET_ROW_ID(HttpStatus.BAD_REQUEST, "더 리로그 시트의 행 ID가 중복됩니다."),
    INVALID_THE_RILOG_SHEET_STATUS(HttpStatus.BAD_REQUEST, "제작대기 상태의 행에만 제작 결과를 기록할 수 있습니다."),
    INVALID_THE_RILOG_PUBLICATION_STATUS(HttpStatus.BAD_REQUEST, "승인완료 상태인 미발행 행에만 발행 결과를 기록할 수 있습니다.");

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public String getErrorCode() {
        return name();
    }
}
