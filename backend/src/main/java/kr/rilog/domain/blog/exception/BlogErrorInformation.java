package kr.rilog.domain.blog.exception;

import kr.rilog.global.exception.ErrorInformation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum BlogErrorInformation implements ErrorInformation {

    BLOG_NOT_FOUND(HttpStatus.NOT_FOUND, "해당 블로그를 찾을 수 없습니다."),
    RILOG_NOT_FOUND(HttpStatus.NOT_FOUND, "작성자의 개인 블로그를 찾을 수 없습니다."),
    ;

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public String getErrorCode() {
        return this.name();
    }
}
