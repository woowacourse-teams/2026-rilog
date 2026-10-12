package kr.rilog.domain.notification.service.content.reader;

import kr.rilog.domain.notification.entity.Notification;
import kr.rilog.domain.notification.entity.enums.NotificationSourceType;
import kr.rilog.domain.notification.service.content.NotificationContent;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class NotificationContentReadStrategy {

    private final Map<NotificationSourceType, NotificationContentReader> readers;

    public NotificationContentReadStrategy(List<NotificationContentReader> readers) {
        this.readers = readers.stream()
                .collect(Collectors.toUnmodifiableMap(
                        NotificationContentReader::supportType,
                        Function.identity()
                ));
    }

    // 반환 Map<Long, NotificationContent>의 Long은 NotificationId를 의미함.
    public Map<Long, NotificationContent> readAll(List<Notification> notifications, Long recipientId) {
        Map<NotificationSourceType, List<Notification>> notificationsByType = notifications.stream()
                .collect(Collectors.groupingBy(Notification::getSourceType));

        Map<Long, NotificationContent> contentsByNotificationId = new HashMap<>();
        notificationsByType.forEach((sourceType, typedNotifications) -> {
            List<Long> sourceIds = typedNotifications.stream()
                    .map(Notification::getSourceId)
                    .toList();

            Map<Long, NotificationContent> contentsBySourceId = getReader(sourceType).readAll(sourceIds, recipientId);

            for (Notification notification : typedNotifications) {
                NotificationContent content = contentsBySourceId.get(notification.getSourceId());
                if (content != null) {
                    contentsByNotificationId.put(notification.getId(), content);
                }
            }
        });

        return contentsByNotificationId;
    }

    private NotificationContentReader getReader(NotificationSourceType sourceType) {
        NotificationContentReader reader = readers.get(sourceType);
        if (reader == null) {
            throw new IllegalStateException("NotificationContentReader is not registered. sourceType=" + sourceType);
        }

        return reader;
    }
}
