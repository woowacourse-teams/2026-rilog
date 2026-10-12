package kr.rilog.domain.notification.service.content.reader;

import kr.rilog.domain.notification.entity.enums.NotificationSourceType;
import kr.rilog.domain.notification.service.content.NotificationContent;

import java.util.List;
import java.util.Map;

public interface NotificationContentReader {

    NotificationSourceType supportType();

    Map<Long, NotificationContent> readAll(List<Long> sourceIds, Long recipientId);

}
