package kr.rilog.domain.notification.exception;

import kr.rilog.global.exception.ErrorInformation;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum NotificationErrorInformation implements ErrorInformation {

    NOTIFICATION_CONTENT_READER_NOT_REGISTERED(HttpStatus.INTERNAL_SERVER_ERROR, "알림 출처 유형에 해당하는 콘텐츠 조회 방식이 등록되지 않았습니다."),
    NOTIFICATION_RECIPIENT_FINDER_NOT_REGISTERED(HttpStatus.INTERNAL_SERVER_ERROR, "알림 유형에 해당하는 수신자 조회 방식이 등록되지 않았습니다."),
    NOTIFICATION_NOT_FOUND(HttpStatus.NOT_FOUND, "알림을 찾을 수 없습니다."),
    ;

    private final HttpStatus httpStatus;
    private final String message;

    @Override
    public String getErrorCode() {
        return name();
    }

}
