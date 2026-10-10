package kr.rilog.domain.notification.service.recipient;

import kr.rilog.domain.notification.entity.enums.NotificationType;

import java.util.List;

public interface NotificationRecipientFinder {

    NotificationType supportType();

    List<Long> findRecipientIds(Long sourceId);

}
