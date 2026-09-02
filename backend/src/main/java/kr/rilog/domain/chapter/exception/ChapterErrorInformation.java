package kr.rilog.domain.chapter.exception;

import kr.rilog.global.exception.ErrorInformation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum ChapterErrorInformation implements ErrorInformation {

    CHAPTER_NOT_FOUND(HttpStatus.NOT_FOUND, "해당 챕터를 찾을 수 없습니다."),
    CHAPTER_NAME_ALREADY_EXISTS(HttpStatus.CONFLICT, "같은 블로그에 동일한 이름의 챕터가 이미 존재합니다."),
    CHAPTER_MANAGE_FORBIDDEN(HttpStatus.FORBIDDEN, "챕터 관리 권한이 없습니다."),
    INVALID_CHAPTER_NAME(HttpStatus.BAD_REQUEST, "챕터 이름은 공백이 아닌 1자 이상 20자 이하여야 합니다."),
    INVALID_CHAPTER_ORDER(HttpStatus.BAD_REQUEST, "활성 챕터 전체를 중복이나 누락 없이 전달해야 합니다."),
    ;

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public String getErrorCode() {
        return name();
    }
}
