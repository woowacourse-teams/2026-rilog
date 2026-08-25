package kr.rilog.domain.upload.exception;

import kr.rilog.global.exception.ErrorInformation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum UploadErrorInformation implements ErrorInformation {

    UNSUPPORTED_IMAGE_FORMAT(HttpStatus.BAD_REQUEST, "지원하지 않는 이미지 형식입니다."),
    IMAGE_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "이미지는 최대 10MB까지 업로드할 수 있습니다."),
    UNSUPPORTED_FILE_FORMAT(HttpStatus.BAD_REQUEST, "지원하지 않는 파일 형식입니다."),
    FILE_SIZE_EXCEEDED(HttpStatus.BAD_REQUEST, "파일은 최대 20MB까지 업로드할 수 있습니다."),
    INVALID_UPLOAD_TARGET(HttpStatus.BAD_REQUEST, "올바르지 않은 업로드 객체입니다."),
    INVALID_S3_URL_SCHEME(HttpStatus.BAD_REQUEST, "S3 객체 주소는 HTTPS 형식이어야 합니다."),
    UNSUPPORTED_S3_HOST(HttpStatus.BAD_REQUEST, "지원하지 않는 S3 객체 주소입니다."),
    S3_OBJECT_KEY_MISSING(HttpStatus.BAD_REQUEST, "S3 객체 키가 없습니다."),
    ;

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public String getErrorCode() {
        return this.name();
    }

}
