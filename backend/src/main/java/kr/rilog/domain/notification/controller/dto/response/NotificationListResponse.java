package kr.rilog.domain.notification.controller.dto.response;

import kr.rilog.domain.notification.entity.enums.NotificationType;
import kr.rilog.domain.notification.service.content.NotificationSourceStatus;
import kr.rilog.domain.notification.service.dto.result.NotificationListResult;
import kr.rilog.domain.notification.service.dto.result.NotificationListResult.NotificationItemResult;

import java.time.LocalDateTime;
import java.util.List;

public record NotificationListResponse(
        List<NotificationItemResponse> notifications,
        int page,
        int size,
        int numberOfElements,
        boolean hasNext
) {

    public static NotificationListResponse from(NotificationListResult result) {
        return new NotificationListResponse(
                result.notifications().stream()
                        .map(NotificationItemResponse::from)
                        .toList(),
                result.page(),
                result.size(),
                result.numberOfElements(),
                result.hasNext()
        );
    }

    public record NotificationItemResponse(
            Long notificationId,
            NotificationType type,
            boolean read,
            LocalDateTime readAt,
            LocalDateTime createdAt,
            NotificationSourceStatus sourceStatus,
            NotificationContentResponse content
    ) {

        private static NotificationItemResponse from(NotificationItemResult result) {
            return new NotificationItemResponse(
                    result.notificationId(),
                    result.type(),
                    result.read(),
                    result.readAt(),
                    result.createdAt(),
                    result.sourceStatus(),
                    result.content() == null ? null : NotificationContentResponse.from(result.content())
            );
        }
    }
}
