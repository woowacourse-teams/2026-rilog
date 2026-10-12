package kr.rilog.domain.notification.entity.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum NotificationType {

    POST_INLINE_COMMENT(NotificationSourceType.INLINE_COMMENT),
    SELECTION_INLINE_COMMENT(NotificationSourceType.INLINE_COMMENT),
    SUBSCRIBED_BLOG_POST_PUBLISHED(NotificationSourceType.POST),
    ;

    private final NotificationSourceType sourceType;
}
