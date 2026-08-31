package kr.rilog.domain.comment.exception;

import kr.rilog.global.exception.ErrorInformation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum CommentErrorInformation implements ErrorInformation {

    COMMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "해당 댓글을 찾을 수 없습니다."),
    COMMENT_AUTHOR_FORBIDDEN(HttpStatus.FORBIDDEN, "댓글 작성자만 요청할 수 있습니다."),
    COMMENT_REPLY_DEPTH_EXCEEDED(HttpStatus.BAD_REQUEST, "답글에는 다시 답글을 작성할 수 없습니다."),
    INVALID_COMMENT_CONTENT(HttpStatus.BAD_REQUEST, "댓글 내용이 올바르지 않습니다."),
    ;

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public String getErrorCode() {
        return name();
    }
}
