package kr.rilog.domain.upload.exception;

import kr.rilog.global.exception.ErrorInformation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

/**
 * 외부 이미지 가져오기 오류. {@link #IMAGE_IMPORT_UNAVAILABLE}를 뺀 나머지는 사용자가 URL이나 이미지를 바꾸거나
 * 다시 시도해 해결할 수 있는 오류다.
 */
@Getter
@AllArgsConstructor
public enum ImageImportErrorInformation implements ErrorInformation {

    INVALID_URL(HttpStatus.BAD_REQUEST, "HTTPS 이미지 URL이 필요합니다."),
    UNSAFE_HOST(HttpStatus.BAD_REQUEST, "허용되지 않는 이미지 호스트입니다."),
    IMAGE_TOO_LARGE(HttpStatus.CONTENT_TOO_LARGE, "이미지는 최대 10MiB입니다."),
    INVALID_IMAGE(HttpStatus.UNPROCESSABLE_CONTENT, "정적 JPEG, PNG, WebP 이미지만 지원합니다."),
    UNSUPPORTED_ENCODING(HttpStatus.UNPROCESSABLE_CONTENT, "압축된 HTTP 응답은 지원하지 않습니다."),
    BUSY(HttpStatus.TOO_MANY_REQUESTS, "잠시 후 다시 시도해주세요."),
    SOURCE_REJECTED(HttpStatus.BAD_GATEWAY, "외부 이미지를 가져올 수 없습니다. 리다이렉트는 지원하지 않습니다."),
    SOURCE_UNAVAILABLE(HttpStatus.BAD_GATEWAY, "외부 이미지 서버에 연결할 수 없습니다."),
    SOURCE_TIMEOUT(HttpStatus.GATEWAY_TIMEOUT, "이미지 다운로드 시간이 초과되었습니다."),
    IMAGE_IMPORT_UNAVAILABLE(HttpStatus.BAD_GATEWAY, "이미지를 가져올 수 없습니다. 잠시 후 다시 시도해주세요."),
    ;

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public String getErrorCode() {
        return this.name();
    }

}
