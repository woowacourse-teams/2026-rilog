package kr.rilog.domain.notification.service.dto.result;

import kr.rilog.domain.notification.entity.Notification;
import kr.rilog.domain.notification.entity.enums.NotificationType;
import kr.rilog.domain.notification.service.content.NotificationContent;
import kr.rilog.domain.notification.service.content.NotificationSourceStatus;
import org.springframework.data.domain.Slice;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public record NotificationListResult(
        List<NotificationItemResult> notifications,
        int page,
        int size,
        int numberOfElements,
        boolean hasNext
) {

    public static NotificationListResult from(
            Slice<Notification> slice,
            Map<Long, NotificationContent> contentsByNotificationId
    ) {
        return new NotificationListResult(
                slice.getContent().stream()
                        .map(notification -> NotificationItemResult.from(
                                notification,
                                contentsByNotificationId.get(notification.getId())
                        ))
                        .toList(),
                slice.getNumber(),
                slice.getSize(),
                slice.getNumberOfElements(),
                slice.hasNext()
        );
    }

    public record NotificationItemResult(
            Long notificationId,
            NotificationType type,
            boolean read,
            LocalDateTime readAt,
            LocalDateTime createdAt,
            NotificationSourceStatus sourceStatus,
            NotificationContent content
    ) {

        private static NotificationItemResult from(Notification notification, NotificationContent content) {
            NotificationSourceStatus sourceStatus = content == null
                    ? NotificationSourceStatus.SOURCE_NOT_FOUND
                    : content.status();

            return new NotificationItemResult(
                    notification.getId(),
                    notification.getType(),
                    notification.isRead(),
                    notification.getReadAt(),
                    notification.getCreatedAt(),
                    sourceStatus,
                    sourceStatus.canExposeContent() ? content : null
            );
        }
    }
}
