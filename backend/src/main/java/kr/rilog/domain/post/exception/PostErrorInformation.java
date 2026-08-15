package kr.rilog.domain.post.exception;

import kr.rilog.global.exception.ErrorInformation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum PostErrorInformation implements ErrorInformation {

    POST_NOT_FOUND(HttpStatus.NOT_FOUND, "해당 게시글을 찾을 수 없습니다."),
    PRIVATE_POST_READ_FORBIDDEN(HttpStatus.FORBIDDEN, "비공개 게시글 조회 권한이 없습니다."),
    RENAME_PLZ(HttpStatus.NOT_FOUND, "메세지 수정!!")
    ;

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public String getErrorCode() {
        return this.name();
    }
}
