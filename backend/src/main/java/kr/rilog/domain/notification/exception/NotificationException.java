package kr.rilog.domain.notification.exception;

import kr.rilog.global.exception.RilogBusinessException;

public class NotificationException extends RilogBusinessException {

    public NotificationException(NotificationErrorInformation errorInformation) {
        super(errorInformation);
    }

}
