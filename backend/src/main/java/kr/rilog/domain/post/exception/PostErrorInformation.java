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
    NOT_POST_AUTHOR(HttpStatus.FORBIDDEN, "해당 게시글의 작성자가 아닙니다."),
    POST_DELETE_FORBIDDEN(HttpStatus.FORBIDDEN, "게시글 삭제 권한이 없습니다."),
    INVALID_POST_CONTENT(HttpStatus.BAD_REQUEST, "게시글 본문 내용이 올바르지 않습니다."),
    INVALID_BLOG_FEED_FILTER(HttpStatus.BAD_REQUEST, "CologSlug는 Rilog 조회에서만 사용할 수 있고 chapterId와 함께 사용할 수 없습니다."),
    DRAFT_NOT_FOUND(HttpStatus.NOT_FOUND, "해당 임시저장 글을 찾을 수 없습니다."),
    ;

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public String getErrorCode() {
        return this.name();
    }
}
